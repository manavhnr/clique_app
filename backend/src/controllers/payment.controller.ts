import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/response';
import { createOrder, verifyPayment, handleWebhook } from '../services/payment.service';

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
