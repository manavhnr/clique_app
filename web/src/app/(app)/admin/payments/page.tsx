'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import Button from '@/components/ui/Button';

interface PaymentUser {
  _id: string;
  name: string;
  username: string;
  phone?: string;
}

interface PaymentEvent {
  _id: string;
  title: string;
  date: string;
  price: number;
}

interface PendingPayment {
  _id: string;
  userId: PaymentUser;
  eventId: PaymentEvent;
  amount: number;        // paise
  utrNumber?: string;
  upiId?: string;
  transactionProofUrl?: string;
  status: string;
  createdAt: string;
}

function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
      <div style={{ width: 28, height: 28, border: '2px solid var(--line-2)', borderTopColor: 'var(--lime)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  );
}

function dateFmt(s: string) {
  return new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatAmount(paise: number) {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
}

function ProofImage({ url }: { url: string }) {
  const [enlarged, setEnlarged] = useState(false);
  return (
    <>
      <button
        onClick={() => setEnlarged(true)}
        style={{
          background: 'transparent', border: '1px solid var(--line-2)',
          borderRadius: 6, overflow: 'hidden', cursor: 'pointer',
          padding: 0, display: 'block', width: 80, height: 80, flexShrink: 0,
        }}
        title="View proof image"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="Payment proof"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </button>

      {enlarged && (
        <div
          onClick={() => setEnlarged(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(11,9,7,0.9)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="Payment proof"
            style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 8 }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setEnlarged(false)}
            style={{
              position: 'fixed', top: 20, right: 20,
              background: 'var(--line-2)', border: '1px solid var(--line)',
              borderRadius: 4, color: 'var(--paper)', width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 16,
            }}
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}

function PaymentRow({
  payment,
  onVerify,
  onReject,
}: {
  payment: PendingPayment;
  onVerify: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const [working, setWorking] = useState(false);

  return (
    <div style={{ borderBottom: '1px solid var(--line)', padding: '20px 4px' }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* Proof image */}
        {payment.transactionProofUrl && (
          <ProofImage url={payment.transactionProofUrl} />
        )}

        {/* Details */}
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontFamily: 'var(--display)', fontSize: 17, fontWeight: 600, color: 'var(--paper)' }}>
              {payment.userId.name}
            </span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.06em' }}>
              @{payment.userId.username}
            </span>
            {payment.userId.phone && (
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--cream)' }}>
                · {payment.userId.phone}
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '6px 24px', marginBottom: 12 }}>
            {[
              { label: 'EVENT',   value: payment.eventId?.title ?? '—'             },
              { label: 'DATE',    value: payment.eventId?.date ? dateFmt(payment.eventId.date) : '—' },
              { label: 'AMOUNT',  value: formatAmount(payment.amount)               },
              { label: 'UTR',     value: payment.utrNumber ?? '—'                  },
              { label: 'UPI ID',  value: payment.upiId ?? '—'                      },
              { label: 'SUBMITTED', value: dateFmt(payment.createdAt)              },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="clique-label" style={{ marginBottom: 2 }}>{label}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--paper)', letterSpacing: '.04em' }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button
              size="sm"
              onClick={() => { setWorking(true); onVerify(payment._id); }}
              disabled={working}
              loading={working}
            >
              Verify payment ✓
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => { setWorking(true); onReject(payment._id); }}
              disabled={working}
            >
              Reject ✗
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading]   = useState(true);
  const [toast, setToast]       = useState('');
  const [toastType, setToastType] = useState<'ok' | 'err'>('ok');

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(''), 3500);
  }

  useEffect(() => {
    api.get('/payments/pending')
      .then(({ data }) => setPayments(data.data?.payments ?? []))
      .catch(() => showToast('Failed to load pending payments', 'err'))
      .finally(() => setLoading(false));
  }, []);

  async function handleVerify(paymentId: string) {
    try {
      await api.patch(`/payments/${paymentId}/verify`);
      setPayments((prev) => prev.filter((p) => p._id !== paymentId));
      showToast('Payment verified. Pass has been generated for the user.', 'ok');
    } catch {
      showToast('Verification failed. Please try again.', 'err');
    }
  }

  async function handleReject(paymentId: string) {
    try {
      await api.patch(`/payments/${paymentId}/reject`);
      setPayments((prev) => prev.filter((p) => p._id !== paymentId));
      showToast('Payment rejected.', 'ok');
    } catch {
      showToast('Rejection failed. Please try again.', 'err');
    }
  }

  return (
    <div>
      {/* Head */}
      <div style={{ marginBottom: 32 }}>
        <div className="clique-label" style={{ marginBottom: 8 }}>ADMIN / PAYMENT VERIFICATION</div>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(28px, 4.5vw, 44px)', fontWeight: 800, lineHeight: 0.94, letterSpacing: '-0.03em', margin: 0 }}>
          Payment review.
        </h1>
        <p style={{ fontFamily: 'var(--display)', fontSize: 15, color: 'var(--cream)', margin: '8px 0 0' }}>
          Verify UPI proof screenshots and release passes.
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          display: 'flex', alignItems: 'center',
          background: toastType === 'ok' ? 'color-mix(in srgb, var(--lime) 8%, transparent)' : 'color-mix(in srgb, var(--hot) 8%, transparent)',
          border: `1px solid ${toastType === 'ok' ? 'color-mix(in srgb, var(--lime) 25%, transparent)' : 'color-mix(in srgb, var(--hot) 25%, transparent)'}`,
          borderRadius: 6, padding: '10px 14px', marginBottom: 20,
        }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: toastType === 'ok' ? 'var(--lime)' : 'var(--hot)', letterSpacing: '.06em' }}>
            {toast}
          </span>
        </div>
      )}

      {/* Pending count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div className="clique-label">AWAITING VERIFICATION</div>
        {payments.length > 0 && (
          <span style={{
            background: 'var(--hot)', color: 'var(--paper)',
            fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600,
            borderRadius: 99, padding: '2px 7px', letterSpacing: '.06em',
          }}>
            {payments.length}
          </span>
        )}
      </div>

      {loading ? (
        <Spinner />
      ) : payments.length === 0 ? (
        <div style={{ padding: '32px 4px', borderTop: '1px solid var(--line)' }}>
          <div className="clique-label" style={{ marginBottom: 8 }}>QUEUE EMPTY</div>
          <p style={{ fontFamily: 'var(--display)', fontSize: 15, color: 'var(--cream)', margin: 0 }}>
            No UPI payments are waiting for verification right now.
          </p>
        </div>
      ) : (
        <div>
          {payments.map((p) => (
            <PaymentRow
              key={p._id}
              payment={p}
              onVerify={handleVerify}
              onReject={handleReject}
            />
          ))}
        </div>
      )}
    </div>
  );
}
