import mongoose, { Document, Schema } from 'mongoose';

export interface IJoinRequest extends Document {
  userId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  hostId: mongoose.Types.ObjectId;
  message?: string;
  status: 'requested' | 'approved' | 'rejected' | 'expired';
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const joinRequestSchema = new Schema<IJoinRequest>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    hostId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, maxlength: 500 },
    status: {
      type: String,
      enum: ['requested', 'approved', 'rejected', 'expired'],
      default: 'requested',
    },
    rejectionReason: { type: String },
  },
  { timestamps: true }
);

joinRequestSchema.index({ userId: 1, eventId: 1 }, { unique: true });
joinRequestSchema.index({ hostId: 1, status: 1 });

export const JoinRequest = mongoose.model<IJoinRequest>('JoinRequest', joinRequestSchema);
