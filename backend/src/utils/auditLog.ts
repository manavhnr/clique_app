import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true },
  targetType: { type: String },
  targetId: { type: mongoose.Schema.Types.ObjectId },
  metadata: { type: mongoose.Schema.Types.Mixed },
  ipAddress: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

interface AuditLogParams {
  actorId?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export async function writeAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await AuditLog.create(params);
  } catch {
    // audit log failure must never crash the request
  }
}

export { AuditLog };
