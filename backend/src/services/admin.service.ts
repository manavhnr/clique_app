import { User } from '../models/User';
import { Event } from '../models/Event';
import { Report } from '../models/Report';
import { Pass } from '../models/Pass';
import { Booking, IBooking } from '../models/Booking';
import { Payment } from '../models/Payment';
import { HostVerification } from '../models/HostVerification';
import { AdminConfig } from '../models/AdminConfig';
import { JoinRequest } from '../models/JoinRequest';
import { Post } from '../models/Post';
import { createError } from '../middleware/error.middleware';
import { writeAuditLog } from '../utils/auditLog';
import { escapeRegex } from '../utils/regex';
import { revokeAllSessions } from './auth.service';
import { applyReportPenalty, incrementEventCreationScore } from './cliquescore.service';

// ─── Users ────────────────────────────────────────────────────────────────────

export async function listUsers(page: number, limit: number, q?: string) {
  const rx = q ? new RegExp(escapeRegex(q), 'i') : null;
  const query = rx ? { $or: [{ name: rx }, { username: rx }, { phone: rx }] } : {};
  const users = await User.find(query)
    .select('name username phone role isVerifiedHost isBanned cliquescore createdAt')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
  const total = await User.countDocuments(query);
  return { users, total, page, limit };
}

export async function banUser(targetId: string, adminId: string) {
  const user = await User.findById(targetId);
  if (!user) throw createError('User not found', 404);
  if (user.role === 'admin') throw createError('Cannot ban an admin', 400);
  await User.findByIdAndUpdate(targetId, { isBanned: true });
  await revokeAllSessions(targetId); // kill refresh tokens so the ban takes effect immediately
  await applyReportPenalty(targetId);
  await writeAuditLog({ actorId: adminId, action: 'USER_BANNED', targetType: 'User', targetId });
}

export async function unbanUser(targetId: string, adminId: string) {
  await User.findByIdAndUpdate(targetId, { isBanned: false });
  await writeAuditLog({ actorId: adminId, action: 'USER_UNBANNED', targetType: 'User', targetId });
}

export async function getUserDetail(userId: string) {
  const user = await User.findById(userId).select(
    'name username phone email profileImage bio city gender dob age interests vibeTags cliquescore followerCount followingCount postCount role isVerifiedHost hostVerificationStatus isBanned connectedSocials createdAt'
  );
  if (!user) throw createError('User not found', 404);

  const [bookings, posts, reports] = await Promise.all([
    Booking.find({ userId })
      .populate('eventId', 'title date startTime locationName images status')
      .select('status amount tierLabel groupSize createdAt eventId')
      .sort({ createdAt: -1 })
      .limit(20),
    Post.find({ userId })
      .select('text mediaUrls mediaType likeCount commentCount status visibility createdAt')
      .sort({ createdAt: -1 })
      .limit(20),
    Report.find({ targetType: 'user', targetId: userId })
      .select('reason description status createdAt')
      .sort({ createdAt: -1 })
      .limit(10),
  ]);

  return { user, bookings, posts, reports };
}

// ─── Events ───────────────────────────────────────────────────────────────────

export async function listEvents(page: number, limit: number, status?: string) {
  const query = status ? { status } : {};
  const events = await Event.find(query)
    .select('title status date privacy capacity bookedCount hostId createdAt')
    .populate('hostId', 'name username')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
  const total = await Event.countDocuments(query);
  return { events, total, page, limit };
}

export async function blockEvent(eventId: string, adminId: string) {
  const event = await Event.findById(eventId);
  if (!event) throw createError('Event not found', 404);
  await Event.findByIdAndUpdate(eventId, { status: 'blocked' });
  await Pass.updateMany({ eventId, status: 'active' }, { status: 'cancelled' });
  await writeAuditLog({ actorId: adminId, action: 'EVENT_BLOCKED', targetType: 'Event', targetId: eventId });
}

export async function unblockEvent(eventId: string, adminId: string) {
  await Event.findByIdAndUpdate(eventId, { status: 'published' });
  await writeAuditLog({ actorId: adminId, action: 'EVENT_UNBLOCKED', targetType: 'Event', targetId: eventId });
}

export async function getEventDetail(eventId: string) {
  const event = await Event.findById(eventId).populate('hostId', 'name username profileImage isVerifiedHost');
  if (!event) throw createError('Event not found', 404);

  const [bookings, requests] = await Promise.all([
    Booking.find({ eventId, status: { $nin: ['cancelled', 'refunded', 'rejected'] } })
      .populate({ path: 'userId', select: 'name username profileImage gender age phone city cliquescore connectedSocials' })
      .select('userId status amount tierLabel groupSize passId createdAt')
      .sort({ createdAt: -1 }),
    JoinRequest.find({ eventId })
      .populate({ path: 'userId', select: 'name username profileImage gender age phone city cliquescore connectedSocials' })
      .sort({ createdAt: -1 }),
  ]);

  return { event, bookings, requests };
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export async function listReports(page: number, limit: number, status?: string) {
  const query = status ? { status } : { status: 'open' };
  const reports = await Report.find(query)
    .populate('reporterId', 'name username')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
  const total = await Report.countDocuments(query);
  return { reports, total, page, limit };
}

export async function resolveReport(reportId: string, adminId: string, resolution: 'resolved' | 'dismissed') {
  const report = await Report.findById(reportId);
  if (!report) throw createError('Report not found', 404);
  await Report.findByIdAndUpdate(reportId, { status: resolution });

  // Penalise the reported user only when an admin upholds the report (not on creation,
  // to prevent score-tanking via mass false reports).
  if (resolution === 'resolved' && (report.targetType === 'user' || report.targetType === 'host')) {
    await applyReportPenalty(report.targetId.toString());
  }

  await writeAuditLog({ actorId: adminId, action: `REPORT_${resolution.toUpperCase()}`, targetType: 'Report', targetId: reportId });
}

// ─── Host Verifications ───────────────────────────────────────────────────────

export async function listPendingHosts(page: number, limit: number) {
  // Fetch all pending — host verifications are a small dataset
  const all = await HostVerification.find({ status: 'pending' })
    .populate('userId', 'name username phone profileImage city isVerifiedHost createdAt')
    .sort({ createdAt: 1 });

  const orphanIds: string[] = [];
  const autoApproveIds: string[] = [];
  const valid: typeof all = [];

  for (const v of all) {
    const u = v.userId as { isVerifiedHost?: boolean } | null;
    if (!u) {
      // User was hard-deleted from the DB — clean up the orphaned record
      orphanIds.push((v._id as object).toString());
    } else if (u.isVerifiedHost) {
      // Role was manually set in the DB — sync the verification status
      autoApproveIds.push((v._id as object).toString());
    } else {
      valid.push(v);
    }
  }

  if (orphanIds.length) HostVerification.deleteMany({ _id: { $in: orphanIds } }).catch(() => {});
  if (autoApproveIds.length) HostVerification.updateMany({ _id: { $in: autoApproveIds } }, { status: 'approved' }).catch(() => {});

  const total = valid.length;
  const paginated = valid.slice((page - 1) * limit, page * limit);
  return { verifications: paginated, total, page, limit };
}

export async function listAllHosts(page: number, limit: number, status?: string) {
  const query = status ? { status } : {};
  const verifications = await HostVerification.find(query)
    .populate('userId', 'name username phone profileImage city isVerifiedHost createdAt')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
  const total = await HostVerification.countDocuments(query);
  return { verifications, total, page, limit };
}

export async function listVerifiedHosts(page: number, limit: number, q?: string) {
  const rx = q ? new RegExp(escapeRegex(q), 'i') : null;
  const query: Record<string, unknown> = { isVerifiedHost: true };
  if (rx) query.$or = [{ name: rx }, { username: rx }];

  const hosts = await User.find(query)
    .select('name username profileImage city cliquescore followerCount postCount createdAt')
    .sort({ followerCount: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
  const total = await User.countDocuments(query);
  return { hosts, total, page, limit };
}

export async function getHostDashboard(hostUserId: string) {
  const host = await User.findById(hostUserId)
    .select('name username profileImage bio city cliquescore followerCount followingCount postCount isVerifiedHost upiId payoutStatus createdAt');
  if (!host || !host.isVerifiedHost) throw createError('Verified host not found', 404);

  const events = await Event.find({ hostId: hostUserId })
    .select('title images date startTime status capacity bookedCount checkedInCount revenue price category locationName privacy')
    .sort({ createdAt: -1 });

  return { host, events };
}

export async function approveHostAdmin(targetUserId: string, adminId: string) {
  const verification = await HostVerification.findOne({ userId: targetUserId });
  if (!verification) throw createError('Verification application not found', 404);
  if (verification.status === 'approved') throw createError('Already approved', 409);

  await HostVerification.findOneAndUpdate(
    { userId: targetUserId },
    { status: 'approved', reviewedBy: adminId }
  );
  await User.findByIdAndUpdate(targetUserId, {
    role: 'host',
    isVerifiedHost: true,
    hostVerificationStatus: 'approved',
  });
  await writeAuditLog({ actorId: adminId, action: 'HOST_APPROVED', targetType: 'User', targetId: targetUserId });
  await incrementEventCreationScore(targetUserId);
}

export async function rejectHostAdmin(targetUserId: string, adminId: string, rejectionReason: string) {
  const verification = await HostVerification.findOne({ userId: targetUserId });
  if (!verification) throw createError('Verification application not found', 404);

  await HostVerification.findOneAndUpdate(
    { userId: targetUserId },
    { status: 'rejected', rejectionReason, reviewedBy: adminId }
  );
  await User.findByIdAndUpdate(targetUserId, { hostVerificationStatus: 'rejected' });
  await writeAuditLog({
    actorId: adminId,
    action: 'HOST_REJECTED',
    targetType: 'User',
    targetId: targetUserId,
    metadata: { rejectionReason },
  });
}

// ─── Remove Guest ─────────────────────────────────────────────────────────────

export async function removeGuestFromEvent(eventId: string, bookingId: string, adminId: string) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw createError('Booking not found', 404);
  if (booking.eventId.toString() !== eventId) throw createError('Booking does not belong to this event', 400);

  const removable = ['confirmed', 'checked_in', 'payment_pending', 'utr_submitted', 'pending'];
  if (!removable.includes(booking.status)) {
    throw createError(`Cannot remove a guest with booking status: ${booking.status}`, 400);
  }

  // Cancel pass if one was issued
  if (booking.passId) {
    await Pass.findByIdAndUpdate(booking.passId, { status: 'cancelled' });
  }

  // Decrement revenue only if the booking was confirmed (money was counted).
  // Release groupSize slots — group bookings occupy multiple capacity slots.
  const wasConfirmed = ['confirmed', 'checked_in'].includes(booking.status);
  const revenueDecrement = wasConfirmed ? -booking.amount : 0;
  const slotsToRelease = booking.groupSize ?? 1;

  await Promise.all([
    Booking.findByIdAndUpdate(bookingId, { status: 'cancelled' }),
    Event.findByIdAndUpdate(eventId, { $inc: { bookedCount: -slotsToRelease, revenue: revenueDecrement } }),
    booking.tierLabel
      ? Event.updateOne(
          { _id: eventId, 'pricingTiers.label': booking.tierLabel },
          { $inc: { 'pricingTiers.$.soldCount': -1 } }
        )
      : Promise.resolve(),
  ]);

  await writeAuditLog({
    actorId: adminId,
    action: 'ADMIN_GUEST_REMOVED',
    targetType: 'Booking',
    targetId: bookingId,
    metadata: { eventId, userId: booking.userId.toString(), slotsReleased: slotsToRelease, amountDeducted: wasConfirmed ? booking.amount : 0 },
  });
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getDashboardStats() {
  const [totalUsers, totalEvents, openReports, totalBookings, pendingHosts, pendingPayments] = await Promise.all([
    User.countDocuments({ isBanned: false }),
    Event.countDocuments({ status: 'published' }),
    Report.countDocuments({ status: 'open' }),
    Booking.countDocuments({ status: 'confirmed' }),
    HostVerification.countDocuments({ status: 'pending' }),
    Payment.countDocuments({ paymentMethod: 'upi', status: 'pending_verification' }),
  ]);
  return { totalUsers, totalEvents, openReports, totalBookings, pendingHosts, pendingPayments };
}

// ─── Admin Config (compliance content) ───────────────────────────────────────

export async function getAdminConfigs(): Promise<Record<string, string>> {
  const docs = await AdminConfig.find({});
  return Object.fromEntries(docs.map((d) => [d.key, d.value]));
}

export async function setAdminConfig(key: string, value: string, adminId: string) {
  await AdminConfig.findOneAndUpdate({ key }, { value }, { upsert: true, new: true });
  await writeAuditLog({
    actorId: adminId,
    action: 'ADMIN_CONFIG_UPDATED',
    targetType: 'AdminConfig',
    metadata: { key },
  });
}
