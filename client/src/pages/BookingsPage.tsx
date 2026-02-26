import React, { useEffect, useState } from 'react';
import { useAsync, useToggle } from '@rahmanazhar/stellar-js/dist/hooks';
import { bookingService, roomService } from '../api/services';

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
  pending: ['confirmed', 'cancelled'],
  confirmed: ['checked_in', 'cancelled'],
  checked_in: ['checked_out'],
  checked_out: [],
  cancelled: [],
};

export default function BookingsPage({ userRole, userId }: { userRole: string; userId: string }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [showCreate, , setShowCreate] = useToggle(false);
  const [rooms, setRooms] = useState<any[]>([]);
  const [form, setForm] = useState({ roomId: '', checkIn: '', checkOut: '', numberOfGuests: '1', notes: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isAdmin = userRole === 'admin';
  const isStaff = userRole === 'admin' || userRole === 'receptionist';

  const listAsync = useAsync(() => bookingService.getAll({ status: filterStatus || undefined }));
  const createAsync = useAsync((data: any) => bookingService.create(data));
  const availRoomsAsync = useAsync((ci: string, co: string) => roomService.getAvailability(ci, co));

  function load() {
    listAsync.execute().then(res => setBookings(res.data || [])).catch(() => {});
  }

  useEffect(() => { load(); }, [filterStatus]);

  async function handleStatusChange(id: string, status: string) {
    const reason = status === 'cancelled' ? prompt('Cancellation reason (optional):') || undefined : undefined;
    try {
      await bookingService.updateStatus(id, status, reason);
      setSuccess(`Booking updated to "${status}"`);
      load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Update failed');
    }
  }

  async function handleCheckAvailability() {
    if (!form.checkIn || !form.checkOut) return;
    try {
      const res = await availRoomsAsync.execute(form.checkIn, form.checkOut);
      setRooms(res.data || []);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Could not check availability');
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await createAsync.execute({
        roomId: form.roomId,
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        numberOfGuests: Number(form.numberOfGuests),
        notes: form.notes,
      });
      setSuccess('Booking created!');
      setShowCreate(false);
      setForm({ roomId: '', checkIn: '', checkOut: '', numberOfGuests: '1', notes: '' });
      setRooms([]);
      load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message);
    }
  }

  function nights(checkIn: string, checkOut: string): number {
    return Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Bookings</h1>
          <p>{bookings.length} booking{bookings.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Booking</button>
      </div>

      {success && <div className="alert alert-success">{success}</div>}

      <div className="filters">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'].map(s =>
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          )}
        </select>
      </div>

      {listAsync.isPending && <div className="loading">Loading bookings…</div>}

      {!listAsync.isPending && bookings.length === 0 && (
        <div className="empty"><div className="empty-icon">📋</div><p>No bookings found</p></div>
      )}

      {bookings.length > 0 && (
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
                  <th>Nights</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => {
                  const transitions = STATUS_TRANSITIONS[b.status] || [];
                  return (
                    <tr key={b._id}>
                      <td><strong style={{ fontFamily: 'monospace', fontSize: 12 }}>{b.bookingReference}</strong></td>
                      <td>{b.roomId?.number ? `Room ${b.roomId.number}` : '-'}<br />
                        <span style={{ fontSize: 11, color: '#888' }}>{b.roomId?.type}</span>
                      </td>
                      <td>
                        {b.customerId?.firstName} {b.customerId?.lastName}<br />
                        <span style={{ fontSize: 11, color: '#888' }}>{b.customerId?.userId?.email}</span>
                      </td>
                      <td>{new Date(b.checkIn).toLocaleDateString()}</td>
                      <td>{new Date(b.checkOut).toLocaleDateString()}</td>
                      <td style={{ textAlign: 'center' }}>{nights(b.checkIn, b.checkOut)}</td>
                      <td><strong>${b.totalPrice.toLocaleString()}</strong></td>
                      <td><span className={`badge badge-${b.status}`}>{b.status.replace('_', ' ')}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {transitions.length > 0 && (
                            <select
                              defaultValue=""
                              onChange={e => { if (e.target.value) handleStatusChange(b._id, e.target.value); e.target.value = ''; }}
                              style={{ padding: '4px 8px', border: '1.5px solid #e0e3e8', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer' }}
                            >
                              <option value="">Change…</option>
                              {transitions.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                            </select>
                          )}
                          {isAdmin && ['pending', 'cancelled', 'checked_out'].includes(b.status) && (
                            <button className="btn btn-danger btn-sm"
                              onClick={async () => {
                                if (!confirm('Delete this booking?')) return;
                                await bookingService.delete(b._id);
                                load();
                              }}>Del</button>
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

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <h2>New Booking</h2>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleCreate}>
              <div className="form-row">
                <div className="form-group">
                  <label>Check-In Date *</label>
                  <input type="date" value={form.checkIn} onChange={e => setForm(p => ({ ...p, checkIn: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Check-Out Date *</label>
                  <input type="date" value={form.checkOut} onChange={e => setForm(p => ({ ...p, checkOut: e.target.value }))} required />
                </div>
              </div>
              <button type="button" className="btn btn-secondary" style={{ marginBottom: 16 }}
                onClick={handleCheckAvailability} disabled={!form.checkIn || !form.checkOut || availRoomsAsync.isPending}>
                {availRoomsAsync.isPending ? 'Checking…' : '🔍 Check Availability'}
              </button>

              {rooms.length > 0 && (
                <div className="form-group">
                  <label>Select Room * ({rooms.length} available)</label>
                  <select value={form.roomId} onChange={e => setForm(p => ({ ...p, roomId: e.target.value }))} required>
                    <option value="">Choose a room…</option>
                    {rooms.map((r: any) => (
                      <option key={r._id} value={r._id}>
                        Room {r.number} — {r.type}, Floor {r.floor}, ${r.pricePerNight}/night
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {rooms.length === 0 && form.checkIn && form.checkOut && !availRoomsAsync.isPending && (
                <div className="alert alert-error" style={{ marginBottom: 12 }}>No rooms available for selected dates</div>
              )}

              <div className="form-group">
                <label>Number of Guests *</label>
                <input type="number" min="1" value={form.numberOfGuests} onChange={e => setForm(p => ({ ...p, numberOfGuests: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Special requests…" />
              </div>

              {form.roomId && form.checkIn && form.checkOut && (
                <div style={{ background: '#f9fafb', borderRadius: 8, padding: '12px 16px', marginBottom: 12, fontSize: 13 }}>
                  {(() => {
                    const room = rooms.find(r => r._id === form.roomId);
                    const n = room && form.checkIn && form.checkOut
                      ? Math.ceil((new Date(form.checkOut).getTime() - new Date(form.checkIn).getTime()) / 86400000)
                      : 0;
                    return room ? (
                      <strong>Total: {n} night{n !== 1 ? 's' : ''} × ${room.pricePerNight} = ${n * room.pricePerNight}</strong>
                    ) : null;
                  })()}
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={createAsync.isPending || !form.roomId}>
                  {createAsync.isPending ? 'Creating…' : 'Create Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
