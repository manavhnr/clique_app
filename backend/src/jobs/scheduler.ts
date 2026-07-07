import { Booking } from '../models/Booking';
import { Event } from '../models/Event';
import { writeAuditLog } from '../utils/auditLog';

const REAP_INTERVAL_MS = 5 * 60 * 1000;        // every 5 minutes
const PAYMENT_PENDING_TTL_MS = 30 * 60 * 1000;  // abandon after 30 minutes unpaid

/**
 * Release capacity held by bookings that were left in `payment_pending`
 * and never completed payment. Each such booking incremented bookedCount
 * at creation, so we decrement it back on expiry.
 */
export async function reapAbandonedBookings(): Promise<void> {
  const cutoff = new Date(Date.now() - PAYMENT_PENDING_TTL_MS);
  const stale = await Booking.find({
    status: 'payment_pending',
    createdAt: { $lt: cutoff },
  }).select('_id eventId');

  for (const booking of stale) {
    // Guard against double-decrement: only act if still payment_pending
    const updated = await Booking.findOneAndUpdate(
      { _id: booking._id, status: 'payment_pending' },
      { status: 'cancelled' }
    );
    if (!updated) continue;
    await Event.findByIdAndUpdate(booking.eventId, { $inc: { bookedCount: -1 } });
    await writeAuditLog({
      action: 'BOOKING_EXPIRED_UNPAID',
      targetType: 'Booking',
      targetId: booking._id.toString(),
    });
  }
}

/** Mark published events whose date has passed as completed (enables ratings). */
export async function completePastEvents(): Promise<void> {
  await Event.updateMany(
    { status: 'published', date: { $lt: new Date() } },
    { status: 'completed' }
  );
}

async function tick(): Promise<void> {
  try {
    await reapAbandonedBookings();
    await completePastEvents();
  } catch (err) {
    console.error('[scheduler] tick failed:', err instanceof Error ? err.message : err);
  }
}

export function startSchedulers(): void {
  // Run once on boot, then on an interval. unref() so it never blocks shutdown.
  void tick();
  const timer = setInterval(() => void tick(), REAP_INTERVAL_MS);
  timer.unref();
}
