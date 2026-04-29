import crypto from 'crypto';
import Razorpay from 'razorpay';
import { Payment } from '../models/Payment';
import { Booking } from '../models/Booking';
import { Event } from '../models/Event';
import { createError } from '../middleware/error.middleware';
import { confirmBookingAfterPayment } from './booking.service';
import { writeAuditLog } from '../utils/auditLog';
import { notifyPaymentSuccess } from './notification.service';

function getRazorpay(): Razorpay {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw createError('Razorpay not configured', 500);
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

function verifySignature(orderId: string, paymentId: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET as string;
  const body = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

// ─── Create Razorpay Order ────────────────────────────────────────────────────

export async function createOrder(bookingId: string, userId: string) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw createError('Booking not found', 404);
  if (booking.userId.toString() !== userId) throw createError('Forbidden', 403);
  if (booking.status !== 'payment_pending') throw createError('Booking does not require payment', 400);

  const event = await Event.findById(booking.eventId).select('title price platformFee status');
  if (!event || event.status === 'cancelled') throw createError('Event no longer available', 400);

  const totalAmount = Math.round((event.price + event.platformFee) * 100); // paise

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
  const isValid = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));

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
