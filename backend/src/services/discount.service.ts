import { EventDiscount, IEventDiscount } from '../models/EventDiscount';
import { Event } from '../models/Event';
import { User } from '../models/User';
import { createError } from '../middleware/error.middleware';
import { writeAuditLog } from '../utils/auditLog';

export function applyDiscount(basePrice: number, discount: Pick<IEventDiscount, 'discountType' | 'discountValue'>): number {
  if (discount.discountType === 'percentage') {
    return Math.max(0, Math.round(basePrice * (1 - discount.discountValue / 100)));
  }
  return Math.max(0, basePrice - discount.discountValue);
}

async function assertHostOwnsEvent(hostId: string, eventId: string) {
  const event = await Event.findById(eventId).select('hostId status');
  if (!event) throw createError('Event not found', 404);
  if (event.hostId.toString() !== hostId) throw createError('Access denied', 403);
  if (['cancelled', 'completed', 'blocked'].includes(event.status)) {
    throw createError('Cannot manage discounts for a cancelled or completed event', 400);
  }
  return event;
}

export async function addDiscounts(
  hostId: string,
  eventId: string,
  usernames: string[],
  discountType: 'percentage' | 'absolute',
  discountValue: number
) {
  await assertHostOwnsEvent(hostId, eventId);

  const users = await User.find({ username: { $in: usernames } }).select('_id username').lean();
  const foundMap = new Map(users.map((u) => [u.username, u._id.toString()]));

  const notFound: string[] = [];
  const added: { username: string; userId: string }[] = [];
  const updated: { username: string; userId: string }[] = [];

  for (const username of usernames) {
    const userId = foundMap.get(username);
    if (!userId) {
      notFound.push(username);
      continue;
    }
    if (userId === hostId) {
      notFound.push(username); // host can't discount themselves
      continue;
    }

    const existing = await EventDiscount.findOne({ eventId, userId });
    if (existing) {
      if (existing.status === 'used') {
        // Already used — can't update a consumed discount
        updated.push({ username, userId });
        continue;
      }
      await EventDiscount.findByIdAndUpdate(existing._id, { discountType, discountValue, status: 'active' });
      updated.push({ username, userId });
    } else {
      await EventDiscount.create({ eventId, hostId, userId, discountType, discountValue });
      added.push({ username, userId });
    }
  }

  await writeAuditLog({
    actorId: hostId,
    action: 'DISCOUNT_ADD_BULK',
    targetType: 'Event',
    targetId: eventId,
    metadata: { added: added.length, updated: updated.length, notFound: notFound.length },
  });

  return { added, updated, notFound };
}

export async function getEventDiscounts(hostId: string, eventId: string) {
  await assertHostOwnsEvent(hostId, eventId);

  const discounts = await EventDiscount.find({ eventId })
    .populate('userId', 'name username profileImage')
    .sort({ createdAt: -1 });

  return { discounts };
}

export async function updateDiscount(
  hostId: string,
  eventId: string,
  discountId: string,
  discountType: 'percentage' | 'absolute',
  discountValue: number
) {
  await assertHostOwnsEvent(hostId, eventId);

  const discount = await EventDiscount.findOne({ _id: discountId, eventId });
  if (!discount) throw createError('Discount not found', 404);
  if (discount.status === 'used') throw createError('Cannot update a discount that has already been used', 400);
  if (discount.status === 'revoked') throw createError('Cannot update a revoked discount', 400);

  await EventDiscount.findByIdAndUpdate(discountId, { discountType, discountValue });

  await writeAuditLog({
    actorId: hostId,
    action: 'DISCOUNT_UPDATE',
    targetType: 'Event',
    targetId: eventId,
    metadata: { discountId, discountType, discountValue },
  });
}

export async function revokeDiscount(hostId: string, eventId: string, discountId: string) {
  await assertHostOwnsEvent(hostId, eventId);

  const discount = await EventDiscount.findOne({ _id: discountId, eventId });
  if (!discount) throw createError('Discount not found', 404);
  if (discount.status === 'used') throw createError('Cannot revoke a discount that has already been used', 400);
  if (discount.status === 'revoked') throw createError('Discount is already revoked', 400);

  await EventDiscount.findByIdAndUpdate(discountId, { status: 'revoked' });

  await writeAuditLog({
    actorId: hostId,
    action: 'DISCOUNT_REVOKE',
    targetType: 'Event',
    targetId: eventId,
    metadata: { discountId },
  });
}

export async function getUserActiveDiscount(userId: string, eventId: string) {
  return EventDiscount.findOne({ userId, eventId, status: 'active' });
}

export async function markDiscountUsed(discountId: string, bookingId: string) {
  await EventDiscount.findByIdAndUpdate(discountId, {
    status: 'used',
    bookingId,
    usedAt: new Date(),
  });
}
