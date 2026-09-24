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

interface PaymentRecord {
  _id: string;
  userId: PaymentUser;
  eventId: PaymentEvent;
  amount: number;        // paise
  utrNumber?: string;
  upiId?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  verifiedBy?: { name: string; username: string };
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

function timeFmt(s: string) {
  return new Date(s).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatAmount(paise: number) {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    paid:     { label: 'VERIFIED',  color: 'var(--lime)' },
    failed:   { label: 'REJECTED',  color: 'var(--hot)' },
    refunded: { label: 'REFUNDED',  color: 'var(--cream)' },
  };
  const s = map[status] ?? { label: status.toUpperCase(), color: 'var(--dim)' };
  return (
    <span style={{
      fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, letterSpacing: '.07em',
      color: s.color, background: `color-mix(in srgb, ${s.color} 12%, transparent)`,
      border: `1px solid color-mix(in srgb, ${s.color} 30%, transparent)`,
      borderRadius: 99, padding: '2px 8px',
    }}>
      {s.label}
    </span>
  );
}

function PendingPaymentRow({
  payment,
  onVerify,
  onReject,
}: {
  payment: PaymentRecord;
  onVerify: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const [working, setWorking] = useState(false);

  return (
    <div style={{ borderBottom: '1px solid var(--line)', padding: '20px 4px' }}>
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
            { label: 'EVENT',     value: payment.eventId?.title ?? '—' },
            { label: 'DATE',      value: payment.eventId?.date ? dateFmt(payment.eventId.date) : '—' },
            { label: 'AMOUNT',    value: formatAmount(payment.amount) },
            { label: 'UTR',       value: payment.utrNumber ?? '—' },
            { label: 'UPI ID',    value: payment.upiId ?? '—' },
            { label: 'SUBMITTED', value: dateFmt(payment.createdAt) },
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
  );
}

function HistoryRow({ payment }: { payment: PaymentRecord }) {
  return (
    <div style={{ borderBottom: '1px solid var(--line)', padding: '16px 4px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontFamily: 'var(--display)', fontSize: 15, fontWeight: 600, color: 'var(--paper)' }}>
          {payment.userId?.name ?? '—'}
        </span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.06em' }}>
          @{payment.userId?.username ?? '—'}
        </span>
        <StatusBadge status={payment.status} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '5px 24px' }}>
        {[
          { label: 'EVENT',    value: payment.eventId?.title ?? '—' },
          { label: 'AMOUNT',   value: formatAmount(payment.amount) },
          { label: 'UTR',      value: payment.utrNumber ?? '—' },
          { label: 'UPI ID',   value: payment.upiId ?? '—' },
          { label: 'RESOLVED', value: timeFmt(payment.updatedAt) },
          ...(payment.verifiedBy ? [{ label: 'BY', value: `@${payment.verifiedBy.username}` }] : []),
        ].map(({ label, value }) => (
          <div key={label}>
            <div className="clique-label" style={{ marginBottom: 1 }}>{label}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--cream)', letterSpacing: '.04em' }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminPaymentsPage() {
  const [pending, setPending]       = useState<PaymentRecord[]>([]);
  const [history, setHistory]       = useState<PaymentRecord[]>([]);
  const [loading, setLoading]       = useState(true);
  const [toast, setToast]           = useState('');
  const [toastType, setToastType]   = useState<'ok' | 'err'>('ok');

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(''), 3500);
  }

  useEffect(() => {
    Promise.all([
      api.get('/payments/pending').then(({ data }) => data.data?.payments ?? []),
      api.get('/payments/history').then(({ data }) => data.data?.payments ?? []),
    ])
      .then(([p, h]) => { setPending(p); setHistory(h); })
      .catch(() => showToast('Failed to load payments', 'err'))
      .finally(() => setLoading(false));
  }, []);

  async function handleVerify(paymentId: string) {
    try {
      await api.patch(`/payments/${paymentId}/verify`);
      const verified = pending.find((p) => p._id === paymentId);
      setPending((prev) => prev.filter((p) => p._id !== paymentId));
      if (verified) setHistory((prev) => [{ ...verified, status: 'paid', updatedAt: new Date().toISOString() }, ...prev]);
      showToast('Payment verified. Pass has been generated for the user.', 'ok');
    } catch {
      showToast('Verification failed. Please try again.', 'err');
    }
  }

  async function handleReject(paymentId: string) {
    try {
      await api.patch(`/payments/${paymentId}/reject`);
      const rejected = pending.find((p) => p._id === paymentId);
      setPending((prev) => prev.filter((p) => p._id !== paymentId));
      if (rejected) setHistory((prev) => [{ ...rejected, status: 'failed', updatedAt: new Date().toISOString() }, ...prev]);
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

      {loading ? (
        <Spinner />
      ) : (
        <>
          {/* ── Pending section ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div className="clique-label">AWAITING VERIFICATION</div>
            {pending.length > 0 && (
              <span style={{
                background: 'var(--hot)', color: 'var(--paper)',
                fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600,
                borderRadius: 99, padding: '2px 7px', letterSpacing: '.06em',
              }}>
                {pending.length}
              </span>
            )}
          </div>

          {pending.length === 0 ? (
            <div style={{ padding: '24px 4px', borderTop: '1px solid var(--line)', marginBottom: 40 }}>
              <div className="clique-label" style={{ marginBottom: 6 }}>QUEUE EMPTY</div>
              <p style={{ fontFamily: 'var(--display)', fontSize: 14, color: 'var(--cream)', margin: 0 }}>
                No UPI payments are waiting for verification right now.
              </p>
            </div>
          ) : (
            <div style={{ marginBottom: 40 }}>
              {pending.map((p) => (
                <PendingPaymentRow
                  key={p._id}
                  payment={p}
                  onVerify={handleVerify}
                  onReject={handleReject}
                />
              ))}
            </div>
          )}

          {/* ── History section ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, marginTop: 8 }}>
            <div className="clique-label">PAYMENT HISTORY</div>
            {history.length > 0 && (
              <span style={{
                background: 'var(--line-2)', color: 'var(--cream)',
                fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600,
                borderRadius: 99, padding: '2px 7px', letterSpacing: '.06em',
              }}>
                {history.length}
              </span>
            )}
          </div>

          {history.length === 0 ? (
            <div style={{ padding: '24px 4px', borderTop: '1px solid var(--line)' }}>
              <p style={{ fontFamily: 'var(--display)', fontSize: 14, color: 'var(--dim)', margin: 0 }}>
                No reviewed payments yet.
              </p>
            </div>
          ) : (
            <div>
              {history.map((p) => (
                <HistoryRow key={p._id} payment={p} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
