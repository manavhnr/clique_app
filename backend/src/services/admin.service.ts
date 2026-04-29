import { User } from '../models/User';
import { Event } from '../models/Event';
import { Report } from '../models/Report';
import { Pass } from '../models/Pass';
import { Booking } from '../models/Booking';
import { createError } from '../middleware/error.middleware';
import { writeAuditLog } from '../utils/auditLog';
import { applyReportPenalty } from './cliquescore.service';

// ─── Users ────────────────────────────────────────────────────────────────────

export async function listUsers(page: number, limit: number, q?: string) {
  const query = q ? { $or: [{ name: new RegExp(q, 'i') }, { username: new RegExp(q, 'i') }, { phone: new RegExp(q, 'i') }] } : {};
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
  await writeAuditLog({ actorId: adminId, action: `REPORT_${resolution.toUpperCase()}`, targetType: 'Report', targetId: reportId });
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getDashboardStats() {
  const [totalUsers, totalEvents, openReports, totalBookings] = await Promise.all([
    User.countDocuments({ isBanned: false }),
    Event.countDocuments({ status: 'published' }),
    Report.countDocuments({ status: 'open' }),
    Booking.countDocuments({ status: 'confirmed' }),
  ]);
  return { totalUsers, totalEvents, openReports, totalBookings };
}
