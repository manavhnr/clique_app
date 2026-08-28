import mongoose, { Document, Schema } from 'mongoose';

export interface IBooking extends Document {
  userId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  hostId: mongoose.Types.ObjectId;
  status: 'pending' | 'payment_pending' | 'utr_submitted' | 'confirmed' | 'checked_in' | 'cancelled' | 'refunded' | 'rejected';
  amount: number;
  tierLabel?: string;
  paymentId?: mongoose.Types.ObjectId;
  passId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    hostId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['pending', 'payment_pending', 'utr_submitted', 'confirmed', 'checked_in', 'cancelled', 'refunded', 'rejected'],
      default: 'pending',
    },
    amount: { type: Number, required: true, min: 0 },
    tierLabel: { type: String },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
    passId: { type: Schema.Types.ObjectId, ref: 'Pass' },
  },
  { timestamps: true }
);

// Unique only across ACTIVE statuses — a cancelled/refunded/rejected booking must not
// block the user from booking the same event again.
bookingSchema.index(
  { userId: 1, eventId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['pending', 'payment_pending', 'utr_submitted', 'confirmed', 'checked_in'] },
    },
  }
);
bookingSchema.index({ userId: 1, status: 1 });
bookingSchema.index({ eventId: 1, status: 1 });
bookingSchema.index({ status: 1, createdAt: 1 }); // reaper scans payment_pending by age

export const Booking = mongoose.model<IBooking>('Booking', bookingSchema);
