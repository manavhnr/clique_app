import { User } from '../models/User';
import { Event } from '../models/Event';
import { Report } from '../models/Report';
import { Pass } from '../models/Pass';
import { Booking } from '../models/Booking';
import { Payment } from '../models/Payment';
import { HostVerification } from '../models/HostVerification';
import { AdminConfig } from '../models/AdminConfig';
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
  const verifications = await HostVerification.find({ status: 'pending' })
    .populate('userId', 'name username phone profileImage city createdAt')
    .sort({ createdAt: 1 })
    .skip((page - 1) * limit)
    .limit(limit);
  const total = await HostVerification.countDocuments({ status: 'pending' });
  return { verifications, total, page, limit };
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
