import mongoose, { Document, Schema } from 'mongoose';

export interface IOTP extends Document {
  phone: string;
  otpHash: string;
  expiresAt: Date;
  createdAt: Date;
}

const otpSchema = new Schema<IOTP>(
  {
    phone: { type: String, required: true },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// TTL index — MongoDB auto-deletes expired OTP documents
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpSchema.index({ phone: 1 });

export const OTP = mongoose.model<IOTP>('OTP', otpSchema);
