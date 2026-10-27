'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Event } from '@/types';
import { getImageUrl } from '@/lib/utils';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

function Spinner({ size = 32 }: { size?: number }) {
  return <div style={{ width: size, height: size, border: '2px solid var(--line-2)', borderTopColor: 'var(--lime)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />;
}

type TicketType = {
  label: string;
  price: number;
  description?: string;
  capacity?: number;
  soldCount: number;
};

type TableSlot = {
  label: string;
  isBooked: boolean;
};

type TableType = {
  _id?: string;
  label: string;
  price: number;
  capacity: number;
  description?: string;
  parentCategory?: string;
  slots: TableSlot[];
};

type Selection = Record<number, number>; // ticketTypeIndex → quantity

export default function TicketsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState<Selection>({});
  const [bookLoading, setBookLoading] = useState(false);
  const [error, setError] = useState('');
  const [tablesOpen, setTablesOpen] = useState(false);
  const [expandedParentCategory, setExpandedParentCategory] = useState<string | null>(null);
  const [expandedCategoryIdx, setExpandedCategoryIdx] = useState<number | null>(null);
  const [selectedTableSlots, setSelectedTableSlots] = useState<Array<{ categoryIdx: number; slotIdx: number }>>([]);
  const [upiModal, setUpiModal] = useState<{ bookingId: string; amount: number } | null>(null);
  const [utr, setUtr] = useState('');
  const [upiId, setUpiId] = useState('');
  const [upiSubmitting, setUpiSubmitting] = useState(false);

  useEffect(() => {
    api.get(`/events/${id}`)
      .then(({ data }) => {
        const ev = data.data.event;
        setEvent(ev);
        // Pre-populate selection from an existing payment_pending booking
        const pending = ev?.userBooking;
        if (pending?.status === 'payment_pending' && pending?.ticketLines?.length > 0) {
          const types: TicketType[] = ev?.ticketTypes ?? [];
          const pre: Selection = {};
          for (const line of pending.ticketLines as { ticketTypeName: string; quantity: number }[]) {
            const idx = types.findIndex((t) => t.label === line.ticketTypeName);
            if (idx !== -1) pre[idx] = line.quantity;
          }
          setSelection(pre);
        }
      })
      .catch(() => setEvent(null))
      .finally(() => setLoading(false));
  }, [id]);

  // Restore pending selection saved before login redirect
  useEffect(() => {
    if (!user) return;
    const key = `clique_pending_selection_${id}`;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const saved = JSON.parse(raw) as Selection;
        setSelection(saved);
        localStorage.removeItem(key);
      }
    } catch { /* ignore */ }
  }, [user, id]);

  const ev = event as unknown as { ticketTypes?: TicketType[]; tables?: TableType[]; hasTableBooking?: boolean; userDiscount?: { discountType: 'percentage' | 'absolute'; discountValue: number } | null };
  const ticketTypes: TicketType[] = ev?.ticketTypes ?? [];
  const tables: TableType[] = ev?.tables ?? [];
  const hasTableBooking = !!(ev?.hasTableBooking && tables.length > 0);
  const userDiscount = ev?.userDiscount ?? null;

  const isSlotSelected = (categoryIdx: number, slotIdx: number) =>
    selectedTableSlots.some((s) => s.categoryIdx === categoryIdx && s.slotIdx === slotIdx);

  const toggleSlot = (categoryIdx: number, slotIdx: number) => {
    setSelectedTableSlots((prev) => {
      const exists = prev.some((s) => s.categoryIdx === categoryIdx && s.slotIdx === slotIdx);
      if (exists) return prev.filter((s) => !(s.categoryIdx === categoryIdx && s.slotIdx === slotIdx));
      return [...prev, { categoryIdx, slotIdx }];
    });
  };

  const tableTotal = selectedTableSlots.reduce((sum, s) => sum + (tables[s.categoryIdx]?.price ?? 0), 0);

  const applyDiscount = (price: number) => {
    if (!userDiscount || price === 0) return price;
    return userDiscount.discountType === 'percentage'
      ? Math.max(0, Math.round(price * (1 - userDiscount.discountValue / 100)))
      : Math.max(0, price - userDiscount.discountValue);
  };

  const totalTickets = Object.values(selection).reduce((a, b) => a + b, 0);
  const rawTotal = Object.entries(selection).reduce((sum, [idx, qty]) => {
    const tt = ticketTypes[Number(idx)];
    return sum + (tt ? tt.price * qty : 0);
  }, 0);
  const totalAmount = applyDiscount(rawTotal);
  const hasSelection = totalTickets > 0 || selectedTableSlots.length > 0;

  const setQty = (idx: number, qty: number) => {
    setSelection((prev) => {
      if (qty <= 0) {
        const next = { ...prev };
        delete next[idx];
        return next;
      }
      return { ...prev, [idx]: qty };
    });
  };

  const pendingBooking = (event as any)?.userBooking?.status === 'payment_pending' ? (event as any).userBooking : null;

  const handleBook = async () => {
    if (!hasSelection || !event) return;
    if (!user) {
      try { localStorage.setItem(`clique_pending_selection_${id}`, JSON.stringify(selection)); } catch { /* ignore */ }
      router.push(`/login?redirect=${encodeURIComponent('/events/' + id + '/tickets')}`);
      return;
    }
    setError(''); setBookLoading(true);
    try {
      const ticketSelections = Object.entries(selection).map(([idx, qty]) => ({
        ticketTypeIndex: Number(idx),
        quantity: qty,
      }));

      let bookingId: string;
      let amount: number;
      let status: string;

      if (pendingBooking) {
        // Update existing payment_pending booking — no new booking created
        const { data: updateRes } = await api.patch(`/bookings/${pendingBooking._id}/selection`, { ticketSelections });
        const updated = updateRes.data?.booking;
        bookingId = updated._id;
        amount = updated.amount;
        status = updated.status;
      } else {
        const payload: Record<string, unknown> = { eventId: id, ticketSelections };
        if (selectedTableSlots.length > 0) {
          payload.tableSelections = selectedTableSlots.map((s) => ({
            tableCategoryIndex: s.categoryIdx,
            tableSlotIndex: s.slotIdx,
          }));
        }
        const { data: bookRes } = await api.post('/bookings', payload);
        const created = bookRes.data?.booking;
        bookingId = created._id;
        amount = created.amount;
        status = created.status;
      }

      if (amount > 0 && status === 'payment_pending') {
        setUtr(''); setUpiId('');
        setUpiModal({ bookingId, amount });
      } else {
        router.push('/passes');
      }
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { message?: string } } };
      if (e.response?.status === 409) {
        router.push('/passes');
      } else {
        setError(e.response?.data?.message ?? 'Booking failed. Please try again.');
      }
    } finally { setBookLoading(false); }
  };

  const handleUPISubmit = async () => {
    if (!upiModal) return;
    const utrVal = utr.trim();
    const upiVal = upiId.trim();
    if (!utrVal && !upiVal) { setError('Enter your UTR number or the UPI ID you paid from.'); return; }
    if (utrVal && utrVal.length < 6) { setError('UTR number must be at least 6 characters.'); return; }
    if (upiVal && upiVal.length < 3) { setError('Enter a valid UPI ID (e.g. 9876543210@upi).'); return; }
    setError(''); setUpiSubmitting(true);
    try {
      await api.post('/payments/upi-submit', {
        bookingId: upiModal.bookingId,
        utrNumber: utrVal || undefined,
        upiId: upiVal || undefined,
      });
      setUpiModal(null);
      router.push('/passes');
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { message?: string; errors?: { message: string }[] } } };
      if (e.response?.status === 409) {
        setUpiModal(null);
        router.push('/passes');
      } else {
        const msg = e.response?.data?.errors?.[0]?.message ?? e.response?.data?.message ?? 'Submission failed. Please try again.';
        if (msg === 'Booking does not require payment') {
          setUpiModal(null);
          router.push('/passes');
        } else {
          setError(msg);
        }
      }
    } finally { setUpiSubmitting(false); }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '96px 0' }}>
      <Spinner />
    </div>
  );

  if (!event || (ticketTypes.length === 0 && !hasTableBooking)) {
    router.replace(`/events/${id}`);
    return null;
  }

  const imageUrl = event.images?.[0] ? getImageUrl(event.images[0]) : null;

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', width: '100%', paddingBottom: 120 }}>
      {/* Back */}
      <button
        onClick={() => router.back()}
        style={{ background: 'transparent', border: 'none', color: 'var(--dim)', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', cursor: 'pointer', padding: '0 0 20px', display: 'inline-block' }}
      >
        ← Back
      </button>

      {/* Event header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28, padding: '16px 0', borderBottom: '1px solid var(--line)' }}>
        {imageUrl && (
          <div style={{ width: 52, height: 52, borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
            <img src={imageUrl} alt={event.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.14em', marginBottom: 4 }}>CHOOSE TICKETS</div>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 20, lineHeight: 1.1, letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.title}</div>
        </div>
      </div>

      {/* Tables collapsible */}
      {hasTableBooking && (() => {
        const hasParentCategories = tables.some((t) => t.parentCategory);
        const parentOrder = hasParentCategories
          ? Array.from(new Set(tables.map((t) => t.parentCategory ?? 'Other')))
          : [];

        const renderCategoryRow = (cat: TableType, ci: number) => {
          const availableSlots = cat.slots.filter((s) => !s.isBooked).length;
          const allBooked = availableSlots === 0;
          const isExpanded = expandedCategoryIdx === ci;
          const selectedInCat = selectedTableSlots.filter((s) => s.categoryIdx === ci);
          const hasAnySelected = selectedInCat.length > 0;
          return (
            <div key={cat._id ?? ci}>
              <button
                type="button"
                onClick={() => {
                  if (allBooked) return;
                  setExpandedCategoryIdx(isExpanded ? null : ci);
                }}
                disabled={allBooked}
                style={{
                  width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 14px', borderRadius: isExpanded ? '8px 8px 0 0' : 8,
                  cursor: allBooked ? 'not-allowed' : 'pointer',
                  border: `1px solid ${hasAnySelected ? 'var(--lime)' : isExpanded ? 'rgba(201,243,110,0.3)' : 'var(--line-2)'}`,
                  borderBottom: isExpanded ? 'none' : undefined,
                  background: hasAnySelected ? 'rgba(201,243,110,0.08)' : isExpanded ? 'rgba(201,243,110,0.04)' : 'rgba(255,255,255,0.03)',
                  opacity: allBooked ? 0.4 : 1, textAlign: 'left',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--display)', fontSize: 14, fontWeight: 600, color: hasAnySelected ? 'var(--lime)' : 'var(--paper)' }}>
                    {cat.label}
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.06em', marginTop: 3 }}>
                    {cat.capacity} pax · {allBooked ? 'Fully booked' : `${availableSlots} of ${cat.slots.length} available`}
                    {selectedInCat.length > 0 ? ` · ${selectedInCat.length} selected` : ''}
                  </div>
                  {cat.description && (
                    <div style={{ fontFamily: 'var(--display)', fontSize: 12, color: 'var(--cream)', marginTop: 4, lineHeight: 1.4 }}>{cat.description}</div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, marginLeft: 14 }}>
                  <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 15, color: hasAnySelected ? 'var(--lime)' : 'var(--paper)' }}>
                    {cat.price === 0 ? 'Free' : `₹${cat.price.toLocaleString('en-IN')}`}
                  </span>
                  {!allBooked && (
                    <span style={{ color: 'var(--dim)', fontSize: 11, fontFamily: 'var(--mono)' }}>{isExpanded ? '▲' : '▶'}</span>
                  )}
                </div>
              </button>
              {isExpanded && (
                <div style={{
                  border: `1px solid rgba(201,243,110,0.3)`, borderTop: 'none',
                  borderRadius: '0 0 8px 8px', padding: '12px 14px',
                  background: 'rgba(201,243,110,0.02)',
                  display: 'flex', flexWrap: 'wrap', gap: 8,
                }}>
                  {cat.slots.map((slot, si) => {
                    const selected = isSlotSelected(ci, si);
                    return (
                      <button
                        key={si}
                        type="button"
                        onClick={() => { if (!slot.isBooked) toggleSlot(ci, si); }}
                        disabled={slot.isBooked}
                        style={{
                          padding: '8px 16px', borderRadius: 6,
                          border: `1px solid ${selected ? 'var(--lime)' : 'var(--line-2)'}`,
                          background: selected ? 'var(--lime)' : slot.isBooked ? 'transparent' : 'rgba(255,255,255,0.04)',
                          color: selected ? 'var(--ink)' : slot.isBooked ? 'var(--dim)' : 'var(--paper)',
                          fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, letterSpacing: '.06em',
                          cursor: slot.isBooked ? 'not-allowed' : 'pointer',
                          opacity: slot.isBooked ? 0.4 : 1,
                          textDecoration: slot.isBooked ? 'line-through' : 'none',
                        }}
                      >
                        {slot.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        };

        return (
          <div style={{ marginBottom: 8 }}>
            {/* Section toggle */}
            <button
              onClick={() => setTablesOpen((o) => !o)}
              style={{
                width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '18px 0', background: 'transparent', border: 'none', cursor: 'pointer',
                borderBottom: '1px solid var(--line-2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 16, color: 'var(--paper)' }}>Tables</span>
                {selectedTableSlots.length > 0 && (
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--lime)', letterSpacing: '.08em', background: 'rgba(201,243,110,0.1)', padding: '3px 8px', borderRadius: 4 }}>
                    {selectedTableSlots.length} table{selectedTableSlots.length !== 1 ? 's' : ''} selected
                  </span>
                )}
              </div>
              <span style={{ color: 'var(--dim)', fontSize: 12, fontFamily: 'var(--mono)', letterSpacing: '.06em' }}>
                {tablesOpen ? '▲' : '▼'}
              </span>
            </button>

            {tablesOpen && (
              <div style={{ paddingTop: 12, paddingBottom: 4, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {hasParentCategories ? (
                  /* Grouped view: parent category → table categories → slots */
                  parentOrder.map((parentName) => {
                    const groupTables = tables
                      .map((t, i) => ({ table: t, originalIdx: i }))
                      .filter(({ table }) => (table.parentCategory ?? 'Other') === parentName);
                    const isParentExpanded = expandedParentCategory === parentName;
                    const hasSelectedInParent = groupTables.some(({ originalIdx }) => selectedTableSlots.some((s) => s.categoryIdx === originalIdx));

                    return (
                      <div key={parentName}>
                        {/* Parent category row */}
                        <button
                          type="button"
                          onClick={() => {
                            const next = isParentExpanded ? null : parentName;
                            setExpandedParentCategory(next);
                            if (!isParentExpanded) setExpandedCategoryIdx(null);
                          }}
                          style={{
                            width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '13px 16px', borderRadius: isParentExpanded ? '8px 8px 0 0' : 8,
                            cursor: 'pointer', textAlign: 'left',
                            border: `1px solid ${hasSelectedInParent ? 'var(--lime)' : isParentExpanded ? 'rgba(201,243,110,0.4)' : 'var(--line-2)'}`,
                            borderBottom: isParentExpanded ? 'none' : undefined,
                            background: hasSelectedInParent ? 'rgba(201,243,110,0.1)' : isParentExpanded ? 'rgba(201,243,110,0.05)' : 'rgba(255,255,255,0.04)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 15, color: hasSelectedInParent ? 'var(--lime)' : 'var(--paper)' }}>
                              {parentName}
                            </span>
                            {hasSelectedInParent && (() => {
                              const count = groupTables.reduce((n, { originalIdx }) => n + selectedTableSlots.filter((s) => s.categoryIdx === originalIdx).length, 0);
                              return (
                                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--lime)', letterSpacing: '.06em', background: 'rgba(201,243,110,0.1)', padding: '2px 7px', borderRadius: 4 }}>
                                  {count} table{count !== 1 ? 's' : ''} selected
                                </span>
                              );
                            })()}
                          </div>
                          <span style={{ color: 'var(--dim)', fontSize: 11, fontFamily: 'var(--mono)' }}>
                            {isParentExpanded ? '▲' : '▼'}
                          </span>
                        </button>

                        {/* Table categories within this parent */}
                        {isParentExpanded && (
                          <div style={{
                            border: `1px solid rgba(201,243,110,0.3)`, borderTop: 'none',
                            borderRadius: '0 0 8px 8px',
                            padding: '10px 12px',
                            background: 'rgba(201,243,110,0.01)',
                            display: 'flex', flexDirection: 'column', gap: 6,
                          }}>
                            {groupTables.map(({ table, originalIdx }) =>
                              renderCategoryRow(table, originalIdx)
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  /* Flat view (no parent categories) */
                  tables.map((cat, ci) => renderCategoryRow(cat, ci))
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Ticket list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {ticketTypes.map((tt, idx) => {
          const isSoldOut = !!(tt.capacity && tt.soldCount >= tt.capacity);
          const qty = selection[idx] ?? 0;
          const hasQty = qty > 0;
          const descLines = tt.description
            ? tt.description.split(/[•·\n]/).map((s) => s.trim()).filter(Boolean)
            : [];

          return (
            <div
              key={idx}
              style={{
                padding: '20px 0',
                borderBottom: '1px solid var(--line-2)',
                opacity: isSoldOut ? 0.4 : 1,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                {/* Left: name + price */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 16, marginBottom: 4, color: 'var(--paper)' }}>{tt.label}</div>
                  <div style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: 15, color: 'var(--cream)', marginBottom: descLines.length > 0 ? 12 : 0 }}>
                    {tt.price === 0 ? 'Free' : `₹${tt.price.toLocaleString('en-IN')}`}
                    {userDiscount && tt.price > 0 && (
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--lime)', marginLeft: 8, letterSpacing: '.06em' }}>
                        → ₹{applyDiscount(tt.price).toLocaleString('en-IN')} after discount
                      </span>
                    )}
                  </div>
                  {descLines.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {descLines.map((line, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, fontFamily: 'var(--display)', fontSize: 12, color: 'var(--dim)', lineHeight: 1.5 }}>
                          <span style={{ flexShrink: 0, color: 'var(--line-2)' }}>•</span>
                          <span>{line}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right: ADD or stepper */}
                <div style={{ flexShrink: 0, alignSelf: 'center' }}>
                  {isSoldOut ? (
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.1em', border: '1px solid var(--line-2)', padding: '8px 14px', borderRadius: 4 }}>SOLD OUT</span>
                  ) : !hasQty ? (
                    <button
                      onClick={() => setQty(idx, 1)}
                      style={{ background: 'transparent', color: 'var(--paper)', border: '1px solid var(--line-2)', padding: '9px 22px', borderRadius: 4, fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', cursor: 'pointer', transition: 'border-color .15s, color .15s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--lime)'; e.currentTarget.style.color = 'var(--lime)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line-2)'; e.currentTarget.style.color = 'var(--paper)'; }}
                    >
                      Add
                    </button>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: '1px solid var(--lime)', borderRadius: 4, overflow: 'hidden' }}>
                      <button
                        onClick={() => setQty(idx, qty - 1)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--lime)', width: 36, height: 36, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(201,243,110,0.12)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        aria-label="Decrease"
                      >
                        −
                      </button>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600, color: 'var(--paper)', minWidth: 28, textAlign: 'center', lineHeight: '36px' }}>
                        {qty}
                      </span>
                      <button
                        onClick={() => setQty(idx, qty + 1)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--lime)', width: 36, height: 36, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(201,243,110,0.12)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        aria-label="Increase"
                        disabled={!!(tt.capacity && qty >= (tt.capacity - tt.soldCount))}
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--hot)', letterSpacing: '.06em', marginTop: 16, lineHeight: 1.5, textAlign: 'center' }}>
          {error}
        </div>
      )}

      {/* Sticky bottom bar */}
      {hasSelection && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          background: 'rgba(11,9,7,0.96)', backdropFilter: 'blur(12px)',
          borderTop: '1px solid var(--line-2)',
          padding: '14px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        }}>
          <div>
            {(() => {
              const grandTotal = totalAmount + tableTotal;
              const grandItems = [
                totalTickets > 0 ? `${totalTickets} ticket${totalTickets !== 1 ? 's' : ''}` : null,
                selectedTableSlots.length > 0 ? `${selectedTableSlots.length} table${selectedTableSlots.length !== 1 ? 's' : ''}` : null,
              ].filter(Boolean).join(' + ');
              return (
                <>
                  <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em', lineHeight: 1 }}>
                    {grandTotal === 0 ? 'Free' : `₹${grandTotal.toLocaleString('en-IN')}`}
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: '.1em', marginTop: 3, textTransform: 'uppercase' }}>
                    {grandItems}
                  </div>
                </>
              );
            })()}
          </div>
          <button
            onClick={handleBook}
            disabled={bookLoading}
            style={{
              background: 'var(--lime)', color: 'var(--ink)',
              border: 'none', padding: '14px 28px',
              borderRadius: 8, fontFamily: 'var(--display)', fontSize: 15, fontWeight: 700,
              cursor: bookLoading ? 'not-allowed' : 'pointer',
              opacity: bookLoading ? 0.6 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {bookLoading ? '…' : pendingBooking ? 'Update selection →' : (totalAmount + tableTotal) === 0 ? 'Get passes →' : 'Book & pay →'}
          </button>
        </div>
      )}

      {/* UPI Payment modal */}
      {upiModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.82)', padding: 20 }} onClick={() => setUpiModal(null)}>
          <div style={{ background: '#0F172A', border: '1px solid #1E293B', borderRadius: 10, width: '100%', maxWidth: 440, boxShadow: '0 40px 80px -20px rgba(0,0,0,0.8)', animation: 'riseIn .25s cubic-bezier(.4,1.4,.5,1) both' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #1E293B' }}>
              <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 20 }}>Pay via UPI</div>
              <button onClick={() => setUpiModal(null)} aria-label="Close" style={{ background: 'transparent', border: 'none', color: '#64748B', fontSize: 28, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ fontFamily: 'var(--display)', fontSize: 14, color: '#94A3B8', lineHeight: 1.5 }}>
                Scan the QR with any UPI app and pay{' '}
                <strong style={{ color: '#F59E0B', fontSize: 16 }}>₹{upiModal.amount}</strong> to Clique.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/upi-qr.png" alt="UPI QR" style={{ width: 220, height: 220, borderRadius: 10, background: '#fff', padding: 8, objectFit: 'contain' }} />
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#64748B', letterSpacing: '.1em' }}>SCAN & PAY ₹{upiModal.amount}</span>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#94A3B8', letterSpacing: '.12em', marginBottom: 8 }}>UTR / TRANSACTION ID *</div>
                <input className="clique-input" style={{ width: '100%', padding: '12px 14px', fontSize: 14, borderRadius: 6, boxSizing: 'border-box' }} placeholder="Enter UTR number" value={utr} onChange={(e) => setUtr(e.target.value)} />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#94A3B8', letterSpacing: '.12em', marginBottom: 8 }}>OR UPI ID YOU PAID FROM</div>
                <input className="clique-input" style={{ width: '100%', padding: '12px 14px', fontSize: 14, borderRadius: 6, boxSizing: 'border-box' }} placeholder="e.g. 9876543210@upi" value={upiId} onChange={(e) => setUpiId(e.target.value)} />
              </div>
              {error && <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--hot)', letterSpacing: '.06em' }}>{error}</div>}
              <button
                onClick={handleUPISubmit}
                disabled={upiSubmitting}
                style={{ width: '100%', background: 'var(--lime)', color: 'var(--ink)', border: 'none', padding: '16px', borderRadius: 6, fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 500, letterSpacing: '.1em', textTransform: 'uppercase', cursor: upiSubmitting ? 'not-allowed' : 'pointer', opacity: upiSubmitting ? 0.6 : 1 }}
              >
                {upiSubmitting ? 'SUBMITTING…' : 'SUBMIT PAYMENT PROOF →'}
              </button>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#64748B', letterSpacing: '.08em', textAlign: 'center' }}>
                YOUR PASS WILL BE ISSUED AFTER VERIFICATION
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
