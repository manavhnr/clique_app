import mongoose, { Document, Schema } from 'mongoose';

export interface IPass extends Document {
  bookingId: mongoose.Types.ObjectId;          // creator's booking for group pass; owner's booking for individual
  userId: mongoose.Types.ObjectId;             // creator (group) or owner (individual)
  eventId: mongoose.Types.ObjectId;
  passType: 'individual' | 'group';
  groupId?: mongoose.Types.ObjectId;           // ref EventSquad (group passes only)
  memberIds?: mongoose.Types.ObjectId[];       // all member userIds covered (group passes only)
  qrTokenHash: string;
  qrCodeUrl?: string;
  status: 'pending_verification' | 'active' | 'used' | 'expired' | 'cancelled';
  checkedInAt?: Date;
  scannedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const passSchema = new Schema<IPass>(
  {
    bookingId:  { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    userId:     { type: Schema.Types.ObjectId, ref: 'User',    required: true },
    eventId:    { type: Schema.Types.ObjectId, ref: 'Event',   required: true },
    passType:   { type: String, enum: ['individual', 'group'], default: 'individual' },
    groupId:    { type: Schema.Types.ObjectId, ref: 'EventSquad' },
    memberIds:  { type: [Schema.Types.ObjectId], default: undefined },
    qrTokenHash: { type: String, required: true, unique: true },
    qrCodeUrl:  { type: String },
    status:     { type: String, enum: ['pending_verification', 'active', 'used', 'expired', 'cancelled'], default: 'active' },
    checkedInAt: { type: Date },
    scannedBy:  { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

passSchema.index({ userId: 1, status: 1 });
passSchema.index({ groupId: 1 });

export const Pass = mongoose.model<IPass>('Pass', passSchema);
