import React, { useEffect, useMemo, useState } from 'react';
import { useAsync, useToggle } from '@rahmanazhar/stellar-js/dist/hooks';
import { bookingService, roomService } from '../api/services';
import { useToast } from '../context/ToastContext';
import { Plus, CalendarDays, Trash2, Search, AlertCircle, X, ChevronDown } from 'lucide-react';

interface Booking {
  _id: string;
  bookingReference: string;
  roomId: any;
  customerId: any;
  checkIn: string;
  checkOut: string;
  status: string;
  numberOfGuests: number;
  totalPrice: number;
  pricePerNight: number;
  notes: string;
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending:     ['confirmed', 'cancelled'],
  confirmed:   ['checked_in', 'cancelled'],
  checked_in:  ['checked_out'],
  checked_out: [],
  cancelled:   [],
};

const ALL_STATUSES = ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'];

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function nights(ci: string, co: string) {
  return Math.ceil((new Date(co).getTime() - new Date(ci).getTime()) / 86400000);
}

export default function BookingsPage({ userRole, userId }: { userRole: string; userId: string }) {
  const toast = useToast();

  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [activeTab,   setActiveTab]   = useState('');
  const [showCreate,, setShowCreate]  = useToggle(false);
  const [availRooms,  setAvailRooms]  = useState<any[]>([]);
  const [form, setForm] = useState({ roomId: '', checkIn: '', checkOut: '', numberOfGuests: '1', notes: '' });
  const [formErr, setFormErr] = useState('');

  const isAdmin = userRole === 'admin';

  const listAsync      = useAsync(() => bookingService.getAll({}));
  const createAsync    = useAsync((data: any) => bookingService.create(data));
  const availRoomsAsync = useAsync((ci: string, co: string) => roomService.getAvailability(ci, co));

  function load() {
    listAsync.execute().then(res => setAllBookings(res.data || [])).catch(() => {});
  }

  useEffect(() => { load(); }, []);

  // Counts per status
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    allBookings.forEach(b => { map[b.status] = (map[b.status] ?? 0) + 1; });
    return map;
  }, [allBookings]);

  // Filtered list based on active tab
  const bookings = useMemo(() =>
    activeTab ? allBookings.filter(b => b.status === activeTab) : allBookings,
    [allBookings, activeTab]
  );

  async function handleStatusChange(id: string, status: string) {
    try {
      await bookingService.updateStatus(id, status);
      toast.success(`Booking updated to "${status.replace('_', ' ')}"`);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Update failed');
    }
  }

  async function handleDelete(id: string, ref: string) {
    if (!confirm(`Delete booking ${ref}? This cannot be undone.`)) return;
    try {
      await bookingService.delete(id);
      toast.success('Booking deleted');
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Delete failed');
    }
  }

  async function handleCheckAvailability() {
    if (!form.checkIn || !form.checkOut) return;
    try {
      const res = await availRoomsAsync.execute(form.checkIn, form.checkOut);
      setAvailRooms(res.data || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Could not check availability');
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormErr('');
    try {
      await createAsync.execute({
        roomId: form.roomId,
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        numberOfGuests: Number(form.numberOfGuests),
        notes: form.notes,
      });
      toast.success('Booking created successfully');
      setShowCreate(false);
      setForm({ roomId: '', checkIn: '', checkOut: '', numberOfGuests: '1', notes: '' });
      setAvailRooms([]);
      load();
    } catch (err: any) {
      setFormErr(err?.response?.data?.error || err.message);
    }
  }

  // Preview price in the form
  const selectedRoom = availRooms.find(r => r._id === form.roomId);
  const nightCount = form.checkIn && form.checkOut
    ? Math.ceil((new Date(form.checkOut).getTime() - new Date(form.checkIn).getTime()) / 86400000)
    : 0;

  return (
    <div>
      {/* ── Header ──────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1>Bookings</h1>
          <p>{allBookings.length} booking{allBookings.length !== 1 ? 's' : ''} total</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowCreate(true); setFormErr(''); }}>
          <Plus size={16} /> New Booking
        </button>
      </div>

      {/* ── Status tabs ──────────────────────────────────── */}
      <div className="status-tabs">
        <button
          className={`status-tab${activeTab === '' ? ' active' : ''}`}
          onClick={() => setActiveTab('')}
        >
          All
          <span className="status-tab-count">{allBookings.length}</span>
        </button>
        {ALL_STATUSES.map(s => (
          <button
            key={s}
            className={`status-tab${activeTab === s ? ' active' : ''}`}
            onClick={() => setActiveTab(s)}
          >
            {s.replace('_', ' ')}
            {counts[s] ? <span className="status-tab-count">{counts[s]}</span> : null}
          </button>
        ))}
      </div>

      {/* ── Loading ─────────────────────────────────────── */}
      {listAsync.isPending && (
        <div className="loading-wrap">
          <div className="spinner" />
          <span>Loading bookings…</span>
        </div>
      )}

      {/* ── Empty ───────────────────────────────────────── */}
      {!listAsync.isPending && bookings.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><CalendarDays size={28} /></div>
            <h3>No bookings found</h3>
            <p>{activeTab ? `No ${activeTab.replace('_', ' ')} bookings.` : 'Create the first booking to get started.'}</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowCreate(true)}>
              <Plus size={16} /> New Booking
            </button>
          </div>
        </div>
      )}

      {/* ── Table ───────────────────────────────────────── */}
      {!listAsync.isPending && bookings.length > 0 && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Room</th>
                  <th>Guest</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th style={{ textAlign: 'center' }}>Nights</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => {
                  const transitions = STATUS_TRANSITIONS[b.status] ?? [];
                  return (
                    <tr key={b._id}>
                      <td>
                        <span className="text-mono" style={{ fontSize: 12, fontWeight: 600 }}>
                          {b.bookingReference}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>
                          {b.roomId?.number ? `Room ${b.roomId.number}` : '—'}
                        </div>
                        {b.roomId?.type && (
                          <div style={{ fontSize: 11, color: 'var(--color-text-3)', textTransform: 'capitalize' }}>
                            {b.roomId.type}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>
                          {b.customerId?.firstName} {b.customerId?.lastName}
                        </div>
                        {b.customerId?.userId?.email && (
                          <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
                            {b.customerId.userId.email}
                          </div>
                        )}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{fmt(b.checkIn)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{fmt(b.checkOut)}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>
                        {nights(b.checkIn, b.checkOut)}
                      </td>
                      <td>
                        <span style={{ fontWeight: 700 }}>${b.totalPrice.toLocaleString()}</span>
                      </td>
                      <td>
                        <span className={`badge badge-${b.status}`}>
                          {b.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          {transitions.length > 0 && (
                            <select
                              className="status-select"
                              style={{ minWidth: 110 }}
                              defaultValue=""
                              onChange={e => {
                                if (e.target.value) handleStatusChange(b._id, e.target.value);
                                e.target.value = '';
                              }}
                            >
                              <option value="">Move to…</option>
                              {transitions.map(t => (
                                <option key={t} value={t}>{t.replace('_', ' ')}</option>
                              ))}
                            </select>
                          )}
                          {isAdmin && ['pending', 'cancelled', 'checked_out'].includes(b.status) && (
                            <button
                              className="btn btn-icon"
                              style={{ color: 'var(--clr-error)' }}
                              title="Delete booking"
                              onClick={() => handleDelete(b._id, b.bookingReference)}
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── New booking modal ────────────────────────────── */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-text">
                <h2>New Booking</h2>
                <p>Select dates, check availability and confirm</p>
              </div>
              <button className="modal-close" onClick={() => setShowCreate(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {formErr && (
                <div className="alert alert-error">
                  <span className="alert-icon"><AlertCircle size={16} /></span>
                  {formErr}
                </div>
              )}

              <form onSubmit={handleCreate} id="booking-form">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      Check-In <span className="form-label-required">*</span>
                    </label>
                    <input className="form-input" type="date"
                      value={form.checkIn}
                      onChange={e => { setForm(p => ({ ...p, checkIn: e.target.value })); setAvailRooms([]); }}
                      required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Check-Out <span className="form-label-required">*</span>
                    </label>
                    <input className="form-input" type="date"
                      value={form.checkOut}
                      onChange={e => { setForm(p => ({ ...p, checkOut: e.target.value })); setAvailRooms([]); }}
                      required />
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ marginTop: 4 }}
                  onClick={handleCheckAvailability}
                  disabled={!form.checkIn || !form.checkOut || availRoomsAsync.isPending}
                >
                  <Search size={14} />
                  {availRoomsAsync.isPending ? 'Checking…' : 'Check Availability'}
                </button>

                {availRooms.length > 0 && (
                  <div className="form-group">
                    <label className="form-label">
                      Select Room <span className="form-label-required">*</span>
                      <span style={{ fontWeight: 400, color: 'var(--color-text-3)' }}>
                        &nbsp;— {availRooms.length} available
                      </span>
                    </label>
                    <select className="form-select" value={form.roomId}
                      onChange={e => setForm(p => ({ ...p, roomId: e.target.value }))} required>
                      <option value="">Choose a room…</option>
                      {availRooms.map((r: any) => (
                        <option key={r._id} value={r._id}>
                          Room {r.number} — {r.type}, Floor {r.floor} — ${r.pricePerNight}/night
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {availRooms.length === 0 && form.checkIn && form.checkOut && !availRoomsAsync.isPending && (
                  <div className="alert alert-warning" style={{ marginTop: 12 }}>
                    <span className="alert-icon"><AlertCircle size={16} /></span>
                    No available rooms for the selected dates.
                  </div>
                )}

                {selectedRoom && nightCount > 0 && (
                  <div className="price-summary">
                    <span style={{ color: 'var(--color-text-2)' }}>
                      {nightCount} night{nightCount !== 1 ? 's' : ''} × ${selectedRoom.pricePerNight}
                    </span>
                    {' = '}
                    <strong>${(nightCount * selectedRoom.pricePerNight).toLocaleString()}</strong>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">
                    Number of Guests <span className="form-label-required">*</span>
                  </label>
                  <input className="form-input" type="number" min="1"
                    value={form.numberOfGuests}
                    onChange={e => setForm(p => ({ ...p, numberOfGuests: e.target.value }))} required />
                </div>

                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea className="form-textarea" rows={2}
                    value={form.notes}
                    onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Special requests, preferences…" />
                </div>
              </form>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button
                form="booking-form"
                type="submit"
                className="btn btn-primary"
                disabled={createAsync.isPending || !form.roomId}
              >
                {createAsync.isPending ? 'Creating…' : 'Create Booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
