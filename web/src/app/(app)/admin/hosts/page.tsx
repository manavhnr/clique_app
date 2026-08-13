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
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="w-7 h-7 rounded-full border-2 border-line-2 border-t-lime animate-spin" />
    </div>
  );
}

function dateFmt(s: string) {
  return new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function VerificationCard({
  v, onApprove, onReject,
}: {
  v: Verification;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason]       = useState('');
  const [working, setWorking]     = useState(false);

  const userId    = v.userId ?? null;
  const userIdStr = userId?._id ?? '';

  async function handleApprove() {
    if (!userIdStr) return;
    setWorking(true);
    try { await onApprove(userIdStr); } catch { setWorking(false); }
  }

  async function handleReject() {
    if (!reason.trim() || !userIdStr) return;
    setWorking(true);
    try { await onReject(userIdStr, reason.trim()); } catch { setWorking(false); }
  }

  return (
    <div className="rounded-xl border border-line-2 bg-card p-5 flex flex-col gap-4">
      {/* Identity + doc links */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-display text-[17px] font-semibold text-paper leading-tight">
              {userId?.name ?? (
                <span className="text-dim italic">User deleted</span>
              )}
            </span>
            {userId?.username && (
              <span className="font-mono text-[10px] text-dim tracking-[.06em]">
                @{userId.username}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {userId?.phone && (
              <span className="font-mono text-[11px] text-cream tracking-[.04em]">
                {userId.phone}
              </span>
            )}
            {userId?.city && (
              <span className="font-mono text-[11px] text-dim">· {userId.city}</span>
            )}
            <span className="font-mono text-[11px] text-dim">
              · Applied {dateFmt(v.createdAt)}
            </span>
          </div>
        </div>

        {/* Doc links — top right */}
        <div className="flex flex-col gap-1 shrink-0 items-end">
          <a
            href={v.documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11px] text-sky underline underline-offset-2 tracking-[.08em] whitespace-nowrap hover:text-paper transition-colors"
          >
            View doc ↗
          </a>
          {v.selfieUrl && (
            <a
              href={v.selfieUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[11px] text-sky underline underline-offset-2 tracking-[.08em] whitespace-nowrap hover:text-paper transition-colors"
            >
              View selfie ↗
            </a>
          )}
        </div>
      </div>

      {/* Meta tags */}
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        <div>
          <span className="clique-label mr-1.5">DOC TYPE</span>
          <span className="font-mono text-[11px] text-cream uppercase tracking-[.06em]">
            {v.documentType}
          </span>
        </div>
        <div className="min-w-0">
          <span className="clique-label mr-1.5">ADDRESS</span>
          <span className="font-mono text-[11px] text-cream break-words">{v.address}</span>
        </div>
      </div>

      {/* Status / actions */}
      {v.status === 'approved' && (
        <span className="stamp text-lime self-start" style={{ fontSize: 10 }}>Approved</span>
      )}

      {v.status === 'rejected' && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="stamp text-hot" style={{ fontSize: 10 }}>Rejected</span>
          {v.rejectionReason && (
            <span className="font-mono text-[11px] text-dim">— {v.rejectionReason}</span>
          )}
        </div>
      )}

      {v.status === 'pending' && !rejecting && (
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" onClick={handleApprove} disabled={working} loading={working}>
            Approve →
          </Button>
          <Button size="sm" variant="danger" onClick={() => setRejecting(true)} disabled={working}>
            Reject
          </Button>
        </div>
      )}

      {v.status === 'pending' && rejecting && (
        <div className="flex flex-col gap-3">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Rejection reason (visible to applicant)..."
            rows={3}
            className="bg-well border border-line-2 rounded-md px-3 py-2.5 font-mono text-[12px] text-paper resize-y outline-none w-full focus:border-lime transition-colors"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="danger" onClick={handleReject} disabled={working || !reason.trim()} loading={working}>
              Confirm reject
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setRejecting(false); setReason(''); }} disabled={working}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminHostsPage() {
  const [pending, setPending]     = useState<Verification[]>([]);
  const [all, setAll]             = useState<Verification[]>([]);
  const [showAll, setShowAll]     = useState(false);
  const [loading, setLoading]     = useState(true);
  const [toast, setToast]         = useState('');
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
      setPending((prev) => prev.filter((v) => v.userId?._id !== userId));
      setAll((prev) => prev.map((v) => v.userId?._id === userId ? { ...v, status: 'approved' as const } : v));
      showToast('Host approved. They can now create events.', 'ok');
    } catch {
      showToast('Failed to approve. Please try again.', 'err');
      throw new Error('approve failed');
    }
  }

  async function handleReject(userId: string, reason: string) {
    try {
      await api.patch(`/admin/hosts/${userId}/reject`, { rejectionReason: reason });
      setPending((prev) => prev.filter((v) => v.userId?._id !== userId));
      setAll((prev) => prev.map((v) => v.userId?._id === userId ? { ...v, status: 'rejected' as const, rejectionReason: reason } : v));
      showToast('Application rejected.', 'ok');
    } catch {
      showToast('Failed to reject. Please try again.', 'err');
      throw new Error('reject failed');
    }
  }

  const approved = all.filter((v) => v.status === 'approved').length;
  const rejected = all.filter((v) => v.status === 'rejected').length;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="clique-label mb-2">ADMIN / HOST VERIFICATION</div>
        <h1 className="font-display font-extrabold leading-[0.94] tracking-[-0.03em] m-0" style={{ fontSize: 'clamp(28px, 4.5vw, 44px)' }}>
          Host applications.
        </h1>
        <p className="font-display text-[15px] text-cream mt-2 m-0">
          Review, approve, or reject creator requests.
        </p>

        {/* Stats row */}
        {!loading && (
          <div className="flex flex-wrap gap-4 mt-5">
            <div className="flex items-center gap-2">
              <span className="clique-label">PENDING</span>
              <span className="font-mono text-[13px] font-semibold text-paper">{pending.length}</span>
            </div>
            <div className="w-px bg-line-2 self-stretch" />
            <div className="flex items-center gap-2">
              <span className="clique-label">APPROVED</span>
              <span className="font-mono text-[13px] font-semibold text-lime">{approved}</span>
            </div>
            <div className="w-px bg-line-2 self-stretch" />
            <div className="flex items-center gap-2">
              <span className="clique-label">REJECTED</span>
              <span className="font-mono text-[13px] font-semibold text-hot">{rejected}</span>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`flex items-center gap-3 rounded-md border px-3.5 py-2.5 mb-5 ${
          toastType === 'ok'
            ? 'bg-lime/10 border-lime/25'
            : 'bg-hot/10 border-hot/25'
        }`}>
          <span className={`font-mono text-[11px] tracking-[.06em] ${toastType === 'ok' ? 'text-lime' : 'text-hot'}`}>
            {toast}
          </span>
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : (
        <>
          {/* Pending queue */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="clique-label">PENDING REVIEW</div>
              {pending.length > 0 && (
                <span className="bg-hot text-paper font-mono text-[10px] font-semibold rounded-full px-2 py-0.5 tracking-[.06em]">
                  {pending.length}
                </span>
              )}
            </div>

            {pending.length === 0 ? (
              <div className="pt-8 pb-4 border-t border-line">
                <div className="clique-label mb-2">NO PENDING APPLICATIONS</div>
                <p className="font-display text-[15px] text-cream m-0">
                  All clear. Check back when new hosts apply.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {pending.map((v) => (
                  <VerificationCard key={v._id} v={v} onApprove={handleApprove} onReject={handleReject} />
                ))}
              </div>
            )}
          </div>

          {/* All applications toggle */}
          {all.length > 0 && (
            <div>
              <button
                onClick={() => setShowAll((x) => !x)}
                className="flex items-center gap-2 bg-transparent border-none text-dim cursor-pointer font-mono text-[11px] tracking-[.1em] uppercase mb-3 hover:text-cream transition-colors"
              >
                <span className="clique-label">ALL APPLICATIONS</span>
                <span
                  className="text-[13px] transition-transform duration-150"
                  style={{ display: 'inline-block', transform: showAll ? 'rotate(90deg)' : 'none' }}
                >
                  ›
                </span>
                <span className="bg-line rounded-full px-1.5 py-px text-[10px] text-dim">
                  {all.length}
                </span>
              </button>
              {showAll && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {all.map((v) => (
                    <VerificationCard key={v._id} v={v} onApprove={handleApprove} onReject={handleReject} />
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
