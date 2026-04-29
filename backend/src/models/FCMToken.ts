import mongoose, { Document, Schema } from 'mongoose';

export interface IFCMToken extends Document {
  userId: mongoose.Types.ObjectId;
  token: string;
  platform?: 'ios' | 'android';
  createdAt: Date;
  updatedAt: Date;
}

const fcmTokenSchema = new Schema<IFCMToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    token: { type: String, required: true },
    platform: { type: String, enum: ['ios', 'android'] },
  },
  { timestamps: true }
);

fcmTokenSchema.index({ userId: 1 });
fcmTokenSchema.index({ token: 1 }, { unique: true });

export const FCMToken = mongoose.model<IFCMToken>('FCMToken', fcmTokenSchema);
