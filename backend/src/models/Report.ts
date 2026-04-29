import mongoose, { Document, Schema } from 'mongoose';

export interface IReport extends Document {
  reporterId: mongoose.Types.ObjectId;
  targetType: 'user' | 'post' | 'event' | 'comment' | 'host';
  targetId: mongoose.Types.ObjectId;
  reason: string;
  description?: string;
  status: 'open' | 'reviewed' | 'resolved' | 'dismissed';
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema<IReport>(
  {
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: ['user', 'post', 'event', 'comment', 'host'], required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    reason: { type: String, required: true },
    description: { type: String, maxlength: 1000 },
    status: { type: String, enum: ['open', 'reviewed', 'resolved', 'dismissed'], default: 'open' },
  },
  { timestamps: true }
);

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ targetType: 1, targetId: 1 });

export const Report = mongoose.model<IReport>('Report', reportSchema);
