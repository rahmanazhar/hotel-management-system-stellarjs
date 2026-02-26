import React, { useEffect, useState } from 'react';
import { useAsync, useToggle, useDebounce } from '@rahmanazhar/stellar-js/dist/hooks';
import { roomService } from '../api/services';

interface Room {
  _id: string;
  number: string;
  type: string;
  status: string;
  floor: number;
  capacity: number;
  pricePerNight: number;
  amenities: string[];
  description: string;
}

const ROOM_TYPES = ['single', 'double', 'twin', 'suite', 'deluxe', 'presidential'];
const STATUSES = ['available', 'occupied', 'maintenance', 'reserved'];

export default function RoomsPage({ userRole }: { userRole: string }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showModal, toggleModal, setModal] = useToggle(false);
  const [editing, setEditing] = useState<Room | null>(null);
  const [form, setForm] = useState({ number: '', type: 'single', floor: '1', capacity: '1', pricePerNight: '100', amenities: '', description: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const listAsync = useAsync(() => roomService.getAll({ status: filterStatus || undefined, type: filterType || undefined }));
  const saveAsync = useAsync(async (data: any) => editing ? roomService.update(editing._id, data) : roomService.create(data));
  const deleteAsync = useAsync((id: string) => roomService.delete(id));

  const isAdmin = userRole === 'admin';
  const isAdminOrReceptionist = userRole === 'admin' || userRole === 'receptionist';

  function load() {
    listAsync.execute().then(res => setRooms(res.data || [])).catch(() => {});
  }

  useEffect(() => { load(); }, [filterStatus, filterType]);

  function openCreate() {
    setEditing(null);
    setForm({ number: '', type: 'single', floor: '1', capacity: '1', pricePerNight: '100', amenities: '', description: '' });
    setError('');
    setModal(true);
  }

  function openEdit(room: Room) {
    setEditing(room);
    setForm({
      number: room.number,
      type: room.type,
      floor: String(room.floor),
      capacity: String(room.capacity),
      pricePerNight: String(room.pricePerNight),
      amenities: room.amenities.join(', '),
      description: room.description,
    });
    setError('');
    setModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        number: form.number,
        type: form.type,
        floor: Number(form.floor),
        capacity: Number(form.capacity),
        pricePerNight: Number(form.pricePerNight),
        amenities: form.amenities.split(',').map(s => s.trim()).filter(Boolean),
        description: form.description,
      };
      await saveAsync.execute(payload);
      setSuccess(editing ? 'Room updated!' : 'Room created!');
      setModal(false);
      load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message);
    }
  }

  async function handleDelete(id: string, number: string) {
    if (!confirm(`Delete room ${number}?`)) return;
    try {
      await deleteAsync.execute(id);
      setSuccess('Room deleted!');
      load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Delete failed');
    }
  }

  async function handleStatusChange(id: string, status: string) {
    try {
      await roomService.update(id, { status });
      load();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Update failed');
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Rooms</h1>
          <p>{rooms.length} room{rooms.length !== 1 ? 's' : ''} found</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={openCreate}>+ Add Room</button>
        )}
      </div>

      {success && <div className="alert alert-success">{success}</div>}

      <div className="filters">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {listAsync.isPending && <div className="loading">Loading rooms…</div>}

      {!listAsync.isPending && rooms.length === 0 && (
        <div className="empty"><div className="empty-icon">🏨</div><p>No rooms found</p></div>
      )}

      <div className="rooms-grid">
        {rooms.map(room => (
          <div key={room._id} className="room-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="room-number">Room {room.number}</div>
                <div className="room-type">{room.type} · Floor {room.floor} · {room.capacity} guest{room.capacity > 1 ? 's' : ''}</div>
              </div>
              <span className={`badge badge-${room.status}`}>{room.status}</span>
            </div>
            <div className="room-price">${room.pricePerNight}<span style={{ fontSize: 13, fontWeight: 400, color: '#888' }}>/night</span></div>
            {room.description && <p style={{ fontSize: 13, color: '#666', marginTop: 6 }}>{room.description}</p>}
            <div className="room-amenities">
              {room.amenities.slice(0, 4).map(a => <span key={a} className="amenity-tag">{a}</span>)}
              {room.amenities.length > 4 && <span className="amenity-tag">+{room.amenities.length - 4}</span>}
            </div>
            {isAdminOrReceptionist && (
              <div className="room-actions">
                {isAdminOrReceptionist && (
                  <select
                    value={room.status}
                    onChange={e => handleStatusChange(room._id, e.target.value)}
                    style={{ flex: 1, padding: '5px 8px', border: '1.5px solid #e0e3e8', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer' }}
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                )}
                {isAdmin && (
                  <>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(room)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(room._id, room.number)}>Del</button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editing ? `Edit Room ${editing.number}` : 'Add New Room'}</h2>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSave}>
              <div className="form-row">
                <div className="form-group">
                  <label>Room Number *</label>
                  <input value={form.number} onChange={e => setForm(p => ({ ...p, number: e.target.value }))} placeholder="101" required />
                </div>
                <div className="form-group">
                  <label>Type *</label>
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                    {ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Floor *</label>
                  <input type="number" min="1" value={form.floor} onChange={e => setForm(p => ({ ...p, floor: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Capacity *</label>
                  <input type="number" min="1" max="10" value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))} required />
                </div>
              </div>
              <div className="form-group">
                <label>Price / Night ($) *</label>
                <input type="number" min="0" value={form.pricePerNight} onChange={e => setForm(p => ({ ...p, pricePerNight: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Amenities (comma separated)</label>
                <input value={form.amenities} onChange={e => setForm(p => ({ ...p, amenities: e.target.value }))} placeholder="WiFi, TV, AC, Minibar" />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saveAsync.isPending}>
                  {saveAsync.isPending ? 'Saving…' : editing ? 'Update Room' : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
