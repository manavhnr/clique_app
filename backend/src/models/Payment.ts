import mongoose, { Document, Schema } from 'mongoose';

export interface IPayment extends Document {
  bookingId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  paymentMethod: 'upi' | 'razorpay';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  utrNumber?: string;
  transactionProofUrl?: string;
  amount: number;
  currency: string;
  status: 'created' | 'attempted' | 'pending_verification' | 'paid' | 'failed' | 'refunded';
  webhookVerified: boolean;
  verifiedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    paymentMethod: { type: String, enum: ['upi', 'razorpay'], default: 'upi' },
    razorpayOrderId: { type: String, unique: true, sparse: true },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    utrNumber: { type: String },
    transactionProofUrl: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: {
      type: String,
      enum: ['created', 'attempted', 'pending_verification', 'paid', 'failed', 'refunded'],
      default: 'created',
    },
    webhookVerified: { type: Boolean, default: false },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

paymentSchema.index({ bookingId: 1 });

export const Payment = mongoose.model<IPayment>('Payment', paymentSchema);
