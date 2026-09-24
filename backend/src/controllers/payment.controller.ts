import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/response';
import { createOrder, verifyPayment, handleWebhook, submitUPIPayment, adminVerifyUPIPayment, adminRejectUPIPayment, listPendingUPIPayments, listUPIPaymentHistory } from '../services/payment.service';

export async function createPaymentOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { bookingId } = req.body;
    const result = await createOrder(bookingId, req.user!.userId);
    sendSuccess(res, result, 'Order created');
  } catch (err) { next(err); }
}

export async function verifyPaymentHandler(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    const result = await verifyPayment(
      bookingId,
      req.user!.userId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );
    sendSuccess(res, result, 'Payment verified. Pass generated.');
  } catch (err) { next(err); }
}

export async function submitUPIHandler(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { bookingId, utrNumber, upiId } = req.body;
    const result = await submitUPIPayment(bookingId, req.user!.userId, utrNumber, upiId);
    sendSuccess(res, result, 'Payment details submitted. Awaiting verification.');
  } catch (err) { next(err); }
}

export async function adminVerifyPaymentHandler(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { paymentId } = req.params;
    const result = await adminVerifyUPIPayment(paymentId, req.user!.userId);
    sendSuccess(res, result, 'Payment verified. Pass generated.');
  } catch (err) { next(err); }
}

export async function adminRejectPaymentHandler(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { paymentId } = req.params;
    await adminRejectUPIPayment(paymentId, req.user!.userId);
    sendSuccess(res, null, 'Payment rejected.');
  } catch (err) { next(err); }
}

export async function listPendingPaymentsHandler(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const payments = await listPendingUPIPayments();
    sendSuccess(res, { payments }, 'Pending UPI payments');
  } catch (err) { next(err); }
}

export async function listPaymentHistoryHandler(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const payments = await listUPIPaymentHistory();
    sendSuccess(res, { payments }, 'UPI payment history');
  } catch (err) { next(err); }
}

export async function webhookHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    if (!signature) {
      res.status(400).json({ success: false, message: 'Missing webhook signature' });
      return;
    }
    // req.body is raw Buffer when using express.raw()
    await handleWebhook(req.body as Buffer, signature);
    res.status(200).json({ success: true });
  } catch (err) { next(err); }
}
