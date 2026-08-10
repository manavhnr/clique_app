'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import Button from '@/components/ui/Button';

interface HostUser {
  _id: string;
  name: string;
  username: string;
  phone?: string;
  city?: string;
  profileImage?: string;
  createdAt: string;
}

interface Verification {
  _id: string;
  userId: HostUser;
  documentType: string;
  documentUrl: string;
  selfieUrl?: string;
  address: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
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

function VerificationRow({
  v, onApprove, onReject,
}: {
  v: Verification;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
}) {
  const [rejecting, setRejecting]   = useState(false);
  const [reason, setReason]         = useState('');
  const [working, setWorking]       = useState(false);

  async function handleApprove() {
    setWorking(true);
    onApprove(v.userId._id);
  }

  async function handleReject() {
    if (!reason.trim()) return;
    setWorking(true);
    onReject(v.userId._id, reason.trim());
  }

  return (
    <div style={{
      borderBottom: '1px solid var(--line)',
      padding: '20px 4px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      {/* Identity row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontFamily: 'var(--display)', fontSize: 17, fontWeight: 600, color: 'var(--paper)' }}>
              {v.userId.name}
            </span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.06em' }}>
              @{v.userId.username}
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            {v.userId.phone && (
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--cream)', letterSpacing: '.04em' }}>
                {v.userId.phone}
              </span>
            )}
            {v.userId.city && (
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)' }}>· {v.userId.city}</span>
            )}
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)' }}>
              · Applied {dateFmt(v.createdAt)}
            </span>
          </div>
          <div style={{ marginTop: 6 }}>
            <span className="clique-label" style={{ marginRight: 6 }}>DOC TYPE</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--cream)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              {v.documentType}
            </span>
          </div>
          <div style={{ marginTop: 4 }}>
            <span className="clique-label" style={{ marginRight: 6 }}>ADDRESS</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--cream)' }}>{v.address}</span>
          </div>
        </div>

        {/* Document links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start', flexShrink: 0 }}>
          <a
            href={v.documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.08em', color: 'var(--sky)', textDecoration: 'underline', textUnderlineOffset: 3 }}
          >
            View document ↗
          </a>
          {v.selfieUrl && (
            <a
              href={v.selfieUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.08em', color: 'var(--sky)', textDecoration: 'underline', textUnderlineOffset: 3 }}
            >
              View selfie ↗
            </a>
          )}
        </div>
      </div>

      {/* Action row */}
      {v.status === 'pending' && !rejecting && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button size="sm" onClick={handleApprove} disabled={working} loading={working}>
            Approve →
          </Button>
          <Button size="sm" variant="danger" onClick={() => setRejecting(true)} disabled={working}>
            Reject
          </Button>
        </div>
      )}

      {v.status === 'pending' && rejecting && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Rejection reason (visible to applicant)..."
            rows={3}
            style={{
              background: 'var(--card)', border: '1px solid var(--line-2)',
              borderRadius: 6, padding: '10px 12px',
              fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--paper)',
              resize: 'vertical', outline: 'none', maxWidth: 480, width: '100%',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--lime)')}
            onBlur={(e)  => (e.target.style.borderColor = 'var(--line-2)')}
          />
          <div style={{ display: 'flex', gap: 10 }}>
            <Button size="sm" variant="danger" onClick={handleReject} disabled={working || !reason.trim()} loading={working}>
              Confirm reject
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setRejecting(false); setReason(''); }} disabled={working}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {v.status === 'approved' && (
        <span className="stamp" style={{ color: 'var(--lime)', alignSelf: 'flex-start', fontSize: 10 }}>Approved</span>
      )}
      {v.status === 'rejected' && (
        <div>
          <span className="stamp" style={{ color: 'var(--hot)', fontSize: 10 }}>Rejected</span>
          {v.rejectionReason && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--dim)', marginLeft: 8 }}>
              — {v.rejectionReason}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminHostsPage() {
  const [pending, setPending]   = useState<Verification[]>([]);
  const [all, setAll]           = useState<Verification[]>([]);
  const [showAll, setShowAll]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const [toast, setToast]       = useState('');
  const [toastType, setToastType] = useState<'ok' | 'err'>('ok');

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(''), 3500);
  }

  useEffect(() => {
    Promise.all([
      api.get('/admin/hosts/pending'),
      api.get('/admin/hosts'),
    ])
      .then(([pendingRes, allRes]) => {
        setPending(pendingRes.data.data?.verifications ?? []);
        setAll(allRes.data.data?.verifications ?? []);
      })
      .catch(() => showToast('Failed to load host applications', 'err'))
      .finally(() => setLoading(false));
  }, []);

  async function handleApprove(userId: string) {
    try {
      await api.patch(`/admin/hosts/${userId}/approve`);
      setPending((prev) => prev.filter((v) => v.userId._id !== userId));
      setAll((prev) => prev.map((v) => v.userId._id === userId ? { ...v, status: 'approved' } : v));
      showToast('Host approved. They can now create events.', 'ok');
    } catch {
      showToast('Failed to approve. Please try again.', 'err');
    }
  }

  async function handleReject(userId: string, reason: string) {
    try {
      await api.patch(`/admin/hosts/${userId}/reject`, { rejectionReason: reason });
      setPending((prev) => prev.filter((v) => v.userId._id !== userId));
      setAll((prev) => prev.map((v) => v.userId._id === userId ? { ...v, status: 'rejected', rejectionReason: reason } : v));
      showToast('Application rejected.', 'ok');
    } catch {
      showToast('Failed to reject. Please try again.', 'err');
    }
  }

  return (
    <div>
      {/* Head */}
      <div style={{ marginBottom: 32 }}>
        <div className="clique-label" style={{ marginBottom: 8 }}>ADMIN / HOST VERIFICATION</div>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(28px, 4.5vw, 44px)', fontWeight: 800, lineHeight: 0.94, letterSpacing: '-0.03em', margin: 0 }}>
          Host applications.
        </h1>
        <p style={{ fontFamily: 'var(--display)', fontSize: 15, color: 'var(--cream)', margin: '8px 0 0' }}>
          Review, approve, or reject creator requests.
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
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
          {/* Pending queue */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div className="clique-label">PENDING REVIEW</div>
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
              <div style={{ padding: '32px 4px', borderTop: '1px solid var(--line)' }}>
                <div className="clique-label" style={{ marginBottom: 8 }}>NO PENDING APPLICATIONS</div>
                <p style={{ fontFamily: 'var(--display)', fontSize: 15, color: 'var(--cream)', margin: 0 }}>
                  All clear. Check back when new hosts apply.
                </p>
              </div>
            ) : (
              <div>
                {pending.map((v) => (
                  <VerificationRow key={v._id} v={v} onApprove={handleApprove} onReject={handleReject} />
                ))}
              </div>
            )}
          </div>

          {/* All applications toggle */}
          {all.length > 0 && (
            <div>
              <button
                onClick={() => setShowAll((x) => !x)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, background: 'transparent',
                  border: 'none', color: 'var(--dim)', cursor: 'pointer',
                  fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase',
                  marginBottom: showAll ? 12 : 0,
                }}
              >
                <span className="clique-label">ALL APPLICATIONS</span>
                <span style={{ display: 'inline-block', transition: 'transform .15s', transform: showAll ? 'rotate(90deg)' : 'none', fontSize: 13 }}>›</span>
                <span style={{
                  background: 'var(--line)', borderRadius: 99,
                  padding: '1px 7px', fontSize: 10, color: 'var(--dim)',
                }}>
                  {all.length}
                </span>
              </button>
              {showAll && (
                <div>
                  {all.map((v) => (
                    <VerificationRow key={v._id} v={v} onApprove={handleApprove} onReject={handleReject} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
