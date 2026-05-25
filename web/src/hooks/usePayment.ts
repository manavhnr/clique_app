'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { Pass } from '@/types';

function loadRazorpaySDK(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as typeof window & { Razorpay?: unknown }).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

interface PayParams {
  bookingId: string;
  eventTitle: string;
  userName: string;
  onSuccess: (pass: Pass) => void;
  onDismiss?: () => void;
}

export function usePayment() {
  const [paying, setPaying] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const initiatePayment = async ({ bookingId, eventTitle, userName, onSuccess, onDismiss }: PayParams) => {
    setPaymentError('');
    setPaying(true);

    let razorpayOpened = false;
    try {
      const { data: orderResp } = await api.post('/payments/create-order', { bookingId });
      const { orderId, amount, currency, keyId } = orderResp.data;

      const loaded = await loadRazorpaySDK();
      if (!loaded) {
        setPaymentError('Payment gateway could not be loaded. Please try again.');
        return;
      }

      razorpayOpened = true;
      setPaying(false);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rzp = new (window as any).Razorpay({
        key: keyId,
        amount,
        currency,
        order_id: orderId,
        name: 'Clique',
        description: eventTitle,
        prefill: { name: userName },
        theme: { color: '#7c3aed' },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          setPaying(true);
          try {
            const { data: verifyResp } = await api.post('/payments/verify', {
              bookingId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            onSuccess(verifyResp.data.pass as Pass);
          } catch {
            setPaymentError(
              'Payment received but confirmation failed. Contact support if your pass is missing.'
            );
          } finally {
            setPaying(false);
          }
        },
        modal: {
          ondismiss: () => onDismiss?.(),
        },
      });

      rzp.open();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setPaymentError(e.response?.data?.message ?? 'Could not initiate payment. Please try again.');
    } finally {
      if (!razorpayOpened) setPaying(false);
    }
  };

  return { paying, paymentError, setPaymentError, initiatePayment };
}
