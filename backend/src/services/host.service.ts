import { HostVerification } from '../models/HostVerification';
import { User } from '../models/User';
import { createError } from '../middleware/error.middleware';
import { writeAuditLog } from '../utils/auditLog';
import { incrementEventCreationScore } from './cliquescore.service';
import path from 'path';

export async function applyForHost(
  userId: string,
  documentType: string,
  address: string,
  documentFile?: Express.Multer.File,
  selfieFile?: Express.Multer.File
) {
  const user = await User.findById(userId);
  if (!user) throw createError('User not found', 404);
  if (user.isVerifiedHost) throw createError('Already a verified host', 409);
  if (user.hostVerificationStatus === 'pending') throw createError('Application already pending', 409);

  const documentUrl = documentFile ? `/uploads/${path.basename(documentFile.path)}` : undefined;
  const selfieUrl = selfieFile ? `/uploads/${path.basename(selfieFile.path)}` : undefined;

  const verification = await HostVerification.findOneAndUpdate(
    { userId },
    { userId, documentType, documentUrl, selfieUrl, address, status: 'pending', rejectionReason: undefined },
    { upsert: true, new: true }
  );

  await User.findByIdAndUpdate(userId, { hostVerificationStatus: 'pending' });

  return verification;
}

export async function getVerificationStatus(userId: string) {
  const verification = await HostVerification.findOne({ userId });
  const user = await User.findById(userId).select('hostVerificationStatus isVerifiedHost role');
  return { verification, user };
}

export async function approveHost(targetUserId: string, adminId: string) {
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

  await writeAuditLog({
    actorId: adminId,
    action: 'HOST_APPROVED',
    targetType: 'User',
    targetId: targetUserId,
  });

  await incrementEventCreationScore(targetUserId);
}

export async function rejectHost(targetUserId: string, adminId: string, rejectionReason: string) {
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

export async function getPendingVerifications(page: number, limit: number) {
  const verifications = await HostVerification.find({ status: 'pending' })
    .populate('userId', 'name username phone profileImage city createdAt')
    .sort({ createdAt: 1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await HostVerification.countDocuments({ status: 'pending' });
  return { verifications, total, page, limit };
}
