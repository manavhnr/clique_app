import mongoose, { Document, Schema } from 'mongoose';

export interface IEventDiscount extends Document {
  eventId: mongoose.Types.ObjectId;
  hostId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  discountType: 'percentage' | 'absolute';
  discountValue: number;
  status: 'active' | 'used' | 'revoked';
  bookingId?: mongoose.Types.ObjectId;
  usedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const eventDiscountSchema = new Schema<IEventDiscount>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    hostId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    discountType: { type: String, enum: ['percentage', 'absolute'], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['active', 'used', 'revoked'], default: 'active' },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking' },
    usedAt: { type: Date },
  },
  { timestamps: true }
);

// One discount per user per event
eventDiscountSchema.index({ eventId: 1, userId: 1 }, { unique: true });
eventDiscountSchema.index({ eventId: 1, status: 1 });
eventDiscountSchema.index({ userId: 1, eventId: 1, status: 1 });

export const EventDiscount = mongoose.model<IEventDiscount>('EventDiscount', eventDiscountSchema);
