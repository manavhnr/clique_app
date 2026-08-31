import crypto from 'crypto';
import Razorpay from 'razorpay';
import { Payment } from '../models/Payment';
import { Booking } from '../models/Booking';
import { Event } from '../models/Event';
import { Pass } from '../models/Pass';
import { createError } from '../middleware/error.middleware';
import { confirmBookingAfterPayment, generatePass } from './booking.service';
import { writeAuditLog } from '../utils/auditLog';
import { notifyPaymentSuccess } from './notification.service';

function getRazorpay(): Razorpay {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw createError('Razorpay not configured', 500);
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

function safeEqualHex(expected: string, provided: string): boolean {
  const a = Buffer.from(expected, 'utf-8');
  const b = Buffer.from(provided ?? '', 'utf-8');
  // timingSafeEqual throws on unequal lengths — guard first
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function verifySignature(orderId: string, paymentId: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET as string;
  const body = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return safeEqualHex(expected, signature);
}

// ─── Create Razorpay Order ────────────────────────────────────────────────────

export async function createOrder(bookingId: string, userId: string) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw createError('Booking not found', 404);
  if (booking.userId.toString() !== userId) throw createError('Forbidden', 403);
  if (booking.status !== 'payment_pending') throw createError('Booking does not require payment', 400);

  const event = await Event.findById(booking.eventId).select('title price platformFee status');
  if (!event || event.status === 'cancelled') throw createError('Event no longer available', 400);

  // Idempotency: reuse an existing active order so retries don't create duplicate records
  const existing = await Payment.findOne({ bookingId, status: { $in: ['created', 'attempted'] } });
  if (existing) {
    return {
      orderId: existing.razorpayOrderId,
      amount: existing.amount,
      currency: existing.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      paymentId: existing._id,
    };
  }

  const totalAmount = Math.round((event.price + (event.platformFee ?? 0)) * 100); // paise

  const razorpay = getRazorpay();
  const order = await razorpay.orders.create({
    amount: totalAmount,
    currency: 'INR',
    receipt: bookingId,
    notes: { bookingId, userId, eventId: booking.eventId.toString() },
  });

  const payment = await Payment.create({
    bookingId,
    userId,
    eventId: booking.eventId,
    razorpayOrderId: order.id,
    amount: totalAmount,
    currency: 'INR',
    status: 'created',
  });

  await writeAuditLog({
    actorId: userId,
    action: 'PAYMENT_ORDER_CREATED',
    targetType: 'Payment',
    targetId: payment._id.toString(),
    metadata: { razorpayOrderId: order.id, amount: totalAmount },
  });

  return {
    orderId: order.id,
    amount: totalAmount,
    currency: 'INR',
    keyId: process.env.RAZORPAY_KEY_ID,
    paymentId: payment._id,
  };
}

// ─── Verify Payment (frontend callback) ──────────────────────────────────────

export async function verifyPayment(
  bookingId: string,
  userId: string,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
) {
  await writeAuditLog({
    actorId: userId,
    action: 'PAYMENT_VERIFY_ATTEMPT',
    targetType: 'Booking',
    targetId: bookingId,
    metadata: { razorpayOrderId, razorpayPaymentId },
  });

  const payment = await Payment.findOne({ razorpayOrderId, bookingId });
  if (!payment) throw createError('Payment record not found', 404);

  const booking = await Booking.findById(bookingId);
  if (!booking || booking.userId.toString() !== userId) throw createError('Forbidden', 403);

  // Idempotency: booking already confirmed — return the existing pass
  if (booking.status === 'confirmed' && booking.passId) {
    const existingPass = await Pass.findById(booking.passId);
    if (existingPass) return { pass: existingPass };
  }

  const eventDoc = await Event.findById(booking.eventId).select('title');
  const isValid = verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);

  if (!isValid) {
    await Payment.findByIdAndUpdate(payment._id, { status: 'failed' });
    await writeAuditLog({
      actorId: userId,
      action: 'PAYMENT_SIGNATURE_INVALID',
      targetType: 'Payment',
      targetId: payment._id.toString(),
    });
    throw createError('Payment verification failed', 400);
  }

  await Payment.findByIdAndUpdate(payment._id, {
    razorpayPaymentId,
    razorpaySignature,
    status: 'paid',
    webhookVerified: false,
  });

  const { pass } = await confirmBookingAfterPayment(bookingId, payment._id.toString());
  void notifyPaymentSuccess(userId, eventDoc?.title || 'the event');

  await writeAuditLog({
    actorId: userId,
    action: 'PAYMENT_VERIFIED',
    targetType: 'Payment',
    targetId: payment._id.toString(),
  });

  return { pass };
}

// ─── Webhook (authoritative confirmation from Razorpay) ───────────────────────

export async function handleWebhook(rawBody: Buffer, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) throw createError('Webhook secret not configured', 500);

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const isValid = safeEqualHex(expected, signature);

  if (!isValid) {
    await writeAuditLog({ action: 'WEBHOOK_SIGNATURE_INVALID' });
    throw createError('Invalid webhook signature', 400);
  }

  const event = JSON.parse(rawBody.toString());

  if (event.event === 'payment.captured') {
    const { order_id, id: paymentId } = event.payload.payment.entity;

    const payment = await Payment.findOne({ razorpayOrderId: order_id });
    if (!payment || payment.webhookVerified) return;

    await Payment.findByIdAndUpdate(payment._id, {
      razorpayPaymentId: paymentId,
      status: 'paid',
      webhookVerified: true,
    });

    // Confirm booking if not already confirmed via frontend verify
    const booking = await Booking.findById(payment.bookingId);
    if (booking && booking.status === 'payment_pending') {
      await confirmBookingAfterPayment(payment.bookingId.toString(), payment._id.toString());
    }

    await writeAuditLog({
      action: 'WEBHOOK_PAYMENT_CAPTURED',
      targetType: 'Payment',
      targetId: payment._id.toString(),
      metadata: { razorpayOrderId: order_id },
    });
  }

  if (event.event === 'payment.failed') {
    const { order_id } = event.payload.payment.entity;
    await Payment.findOneAndUpdate({ razorpayOrderId: order_id }, { status: 'failed' });
  }
}

// ─── Submit UPI Payment ───────────────────────────────────────────────────────

export async function submitUPIPayment(
  bookingId: string,
  userId: string,
  utrNumber: string | undefined,
  upiId: string | undefined,
  transactionProofUrl?: string
) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw createError('Booking not found', 404);
  if (booking.userId.toString() !== userId) throw createError('Forbidden', 403);
  if (!['payment_pending', 'utr_submitted'].includes(booking.status)) {
    throw createError('Booking does not require payment', 400);
  }

  const event = await Event.findById(booking.eventId).select('title price platformFee status');
  if (!event || event.status === 'cancelled') throw createError('Event no longer available', 400);

  const totalAmount = Math.round(booking.amount * 100);

  // Resubmission: booking already in utr_submitted — just update the UTR on existing payment
  if (booking.status === 'utr_submitted') {
    const existingPayment = await Payment.findOne({ bookingId, status: 'pending_verification' });
    if (existingPayment) {
      await Payment.findByIdAndUpdate(existingPayment._id, { utrNumber, upiId, transactionProofUrl });
      await writeAuditLog({
        actorId: userId,
        action: 'UPI_PAYMENT_UTR_UPDATED',
        targetType: 'Payment',
        targetId: existingPayment._id.toString(),
        metadata: { bookingId, utrNumber },
      });
      return { paymentId: existingPayment._id, passId: booking.passId, status: 'pending_verification' };
    }
  }

  // Idempotency for payment_pending: if a previous attempt created a payment but crashed
  // before updating the booking status, reuse the orphaned payment record instead of
  // creating a duplicate.
  if (booking.status === 'payment_pending') {
    const orphaned = await Payment.findOne({ bookingId, status: 'pending_verification' });
    if (orphaned) {
      await Payment.findByIdAndUpdate(orphaned._id, { utrNumber, upiId, transactionProofUrl });
      // Re-generate pass if none exists
      if (!booking.passId) {
        const pass = await generatePass(bookingId, userId, booking.eventId.toString());
        await Pass.findByIdAndUpdate(pass._id, { status: 'pending_verification' });
        await Booking.findByIdAndUpdate(bookingId, {
          status: 'utr_submitted',
          passId: pass._id,
          paymentId: orphaned._id,
        });
        return { paymentId: orphaned._id, passId: pass._id, status: 'pending_verification' };
      }
      await Booking.findByIdAndUpdate(bookingId, { status: 'utr_submitted', paymentId: orphaned._id });
      return { paymentId: orphaned._id, passId: booking.passId, status: 'pending_verification' };
    }
  }

  const payment = await Payment.create({
    bookingId,
    userId,
    eventId: booking.eventId,
    paymentMethod: 'upi',
    utrNumber,
    upiId,
    transactionProofUrl,
    amount: totalAmount,
    currency: 'INR',
    status: 'pending_verification',
  });

  // Generate pass immediately with pending_verification status — QR is withheld until admin confirms
  const pass = await generatePass(bookingId, userId, booking.eventId.toString());
  await Pass.findByIdAndUpdate(pass._id, { status: 'pending_verification' });

  await Booking.findByIdAndUpdate(bookingId, {
    status: 'utr_submitted',
    passId: pass._id,
    paymentId: payment._id,
  });

  await writeAuditLog({
    actorId: userId,
    action: 'UPI_PAYMENT_SUBMITTED',
    targetType: 'Payment',
    targetId: payment._id.toString(),
    metadata: { bookingId, utrNumber, upiId, amount: totalAmount },
  });

  return { paymentId: payment._id, passId: pass._id, status: 'pending_verification' };
}

// ─── Admin: Verify UPI Payment ────────────────────────────────────────────────

export async function adminVerifyUPIPayment(paymentId: string, adminId: string) {
  const payment = await Payment.findById(paymentId);
  if (!payment) throw createError('Payment not found', 404);
  if (payment.status !== 'pending_verification') throw createError('Payment is not pending verification', 400);
  if (payment.paymentMethod !== 'upi') throw createError('Only UPI payments can be manually verified', 400);

  await Payment.findByIdAndUpdate(paymentId, {
    status: 'paid',
    webhookVerified: true,
    verifiedBy: adminId,
  });

  const booking = await Booking.findById(payment.bookingId);
  if (!booking) throw createError('Booking not found', 404);

  const eventDoc = await Event.findById(payment.eventId).select('title');

  // Activate the pre-generated pass (created during UTR submission)
  let pass = null;
  if (booking.passId) {
    pass = await Pass.findByIdAndUpdate(
      booking.passId,
      { status: 'active' },
      { new: true }
    );
  }

  await Booking.findByIdAndUpdate(payment.bookingId, { status: 'confirmed' });

  const { incrementEventAttendance } = await import('./cliquescore.service');
  await incrementEventAttendance(payment.userId.toString());

  void notifyPaymentSuccess(payment.userId.toString(), eventDoc?.title || 'the event');

  await writeAuditLog({
    actorId: adminId,
    action: 'UPI_PAYMENT_VERIFIED',
    targetType: 'Payment',
    targetId: paymentId,
    metadata: { bookingId: payment.bookingId.toString() },
  });

  return { pass };
}

// ─── Admin: Reject UPI Payment ────────────────────────────────────────────────

export async function adminRejectUPIPayment(paymentId: string, adminId: string) {
  const payment = await Payment.findById(paymentId);
  if (!payment) throw createError('Payment not found', 404);
  if (payment.status !== 'pending_verification') throw createError('Payment is not pending verification', 400);

  await Payment.findByIdAndUpdate(paymentId, { status: 'failed', verifiedBy: adminId });

  await writeAuditLog({
    actorId: adminId,
    action: 'UPI_PAYMENT_REJECTED',
    targetType: 'Payment',
    targetId: paymentId,
    metadata: { bookingId: payment.bookingId.toString() },
  });
}

// ─── List Pending UPI Payments (admin) ───────────────────────────────────────

export async function listPendingUPIPayments() {
  return Payment.find({ paymentMethod: 'upi', status: 'pending_verification' })
    .populate('userId', 'name username phone')
    .populate('eventId', 'title date price')
    .populate('bookingId', 'status')
    .sort({ createdAt: -1 });
}

// ─── Refund (called when a paid booking is cancelled) ─────────────────────────

/**
 * Refund the captured payment for a booking, if any. Idempotent: a payment that
 * isn't in `paid` state (already refunded/failed/unpaid) is a no-op.
 * Returns true if a refund was issued.
 */
export async function refundBookingPayment(bookingId: string, actorId: string): Promise<boolean> {
  const payment = await Payment.findOne({ bookingId, status: 'paid' });
  if (!payment || !payment.razorpayPaymentId) return false;

  const razorpay = getRazorpay();
  await razorpay.payments.refund(payment.razorpayPaymentId, {
    amount: payment.amount, // full refund, in paise
    speed: 'normal',
    notes: { bookingId, reason: 'booking_cancelled' },
  });

  await Payment.findByIdAndUpdate(payment._id, { status: 'refunded' });
  await writeAuditLog({
    actorId,
    action: 'PAYMENT_REFUNDED',
    targetType: 'Payment',
    targetId: payment._id.toString(),
    metadata: { bookingId, amount: payment.amount },
  });

  return true;
}
