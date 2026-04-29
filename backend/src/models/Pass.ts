import mongoose, { Document, Schema } from 'mongoose';

export interface IPass extends Document {
  bookingId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  qrTokenHash: string;
  qrCodeUrl?: string;
  status: 'active' | 'used' | 'expired' | 'cancelled';
  checkedInAt?: Date;
  scannedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const passSchema = new Schema<IPass>(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    qrTokenHash: { type: String, required: true, unique: true },
    qrCodeUrl: { type: String },
    status: { type: String, enum: ['active', 'used', 'expired', 'cancelled'], default: 'active' },
    checkedInAt: { type: Date },
    scannedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

passSchema.index({ userId: 1, status: 1 });

export const Pass = mongoose.model<IPass>('Pass', passSchema);
