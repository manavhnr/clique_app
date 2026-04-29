import { Report } from '../models/Report';
import { createError } from '../middleware/error.middleware';

export async function createReport(
  reporterId: string,
  targetType: string,
  targetId: string,
  reason: string,
  description?: string
) {
  const existing = await Report.findOne({ reporterId, targetType, targetId, status: 'open' });
  if (existing) throw createError('You have already reported this', 409);

  const report = await Report.create({ reporterId, targetType, targetId, reason, description });
  return report;
}

export async function getReports(page: number, limit: number, status?: string) {
  const query = status ? { status } : {};
  const reports = await Report.find(query)
    .populate('reporterId', 'name username')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await Report.countDocuments(query);
  return { reports, total, page, limit };
}

export async function updateReportStatus(
  reportId: string,
  status: 'open' | 'reviewed' | 'resolved' | 'dismissed'
) {
  const report = await Report.findByIdAndUpdate(reportId, { status }, { new: true });
  if (!report) throw createError('Report not found', 404);
  return report;
}
