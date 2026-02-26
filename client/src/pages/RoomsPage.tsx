import React, { useEffect, useState } from 'react';
import { useAsync, useToggle } from '@rahmanazhar/stellar-js/dist/hooks';
import { roomService } from '../api/services';
import { useToast } from '../context/ToastContext';
import {
  Plus, Pencil, Trash2, Search, BedDouble,
  Users, DollarSign, Building2, X, AlertCircle,
} from 'lucide-react';

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
const STATUSES   = ['available', 'occupied', 'maintenance', 'reserved'];

const EMPTY_FORM = {
  number: '', type: 'single', floor: '1',
  capacity: '1', pricePerNight: '100',
  amenities: '', description: '',
};

export default function RoomsPage({ userRole }: { userRole: string }) {
  const toast = useToast();

  const [rooms,        setRooms]        = useState<Room[]>([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType,   setFilterType]   = useState('');
  const [search,       setSearch]       = useState('');
  const [showModal,, setModal]          = useToggle(false);
  const [editing,  setEditing]          = useState<Room | null>(null);
  const [form,     setForm]             = useState(EMPTY_FORM);
  const [formErr,  setFormErr]          = useState('');

  const isAdmin             = userRole === 'admin';
  const isAdminOrReceptionist = userRole === 'admin' || userRole === 'receptionist';

  const listAsync   = useAsync(() => roomService.getAll({ status: filterStatus || undefined, type: filterType || undefined }));
  const saveAsync   = useAsync(async (data: any) => editing ? roomService.update(editing._id, data) : roomService.create(data));
  const deleteAsync = useAsync((id: string) => roomService.delete(id));

  function load() {
    listAsync.execute().then(res => setRooms(res.data || [])).catch(() => {});
  }

  useEffect(() => { load(); }, [filterStatus, filterType]);

  const filtered = rooms.filter(r =>
    !search || r.number.toLowerCase().includes(search.toLowerCase()) ||
    r.type.toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormErr('');
    setModal(true);
  }

  function openEdit(room: Room) {
    setEditing(room);
    setForm({
      number:       room.number,
      type:         room.type,
      floor:        String(room.floor),
      capacity:     String(room.capacity),
      pricePerNight: String(room.pricePerNight),
      amenities:    room.amenities.join(', '),
      description:  room.description,
    });
    setFormErr('');
    setModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setFormErr('');
    try {
      const payload = {
        number:       form.number,
        type:         form.type,
        floor:        Number(form.floor),
        capacity:     Number(form.capacity),
        pricePerNight: Number(form.pricePerNight),
        amenities:    form.amenities.split(',').map(s => s.trim()).filter(Boolean),
        description:  form.description,
      };
      await saveAsync.execute(payload);
      toast.success(editing ? 'Room updated successfully' : 'Room created successfully');
      setModal(false);
      load();
    } catch (err: any) {
      setFormErr(err?.response?.data?.error || err.message);
    }
  }

  async function handleDelete(id: string, number: string) {
    if (!confirm(`Delete room ${number}? This cannot be undone.`)) return;
    try {
      await deleteAsync.execute(id);
      toast.success(`Room ${number} deleted`);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Delete failed');
    }
  }

  async function handleStatusChange(id: string, status: string) {
    try {
      await roomService.update(id, { status });
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Update failed');
    }
  }

  return (
    <div>
      {/* ── Page header ──────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1>Rooms</h1>
          <p>{filtered.length} of {rooms.length} room{rooms.length !== 1 ? 's' : ''}</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> Add Room
          </button>
        )}
      </div>

      {/* ── Filters ──────────────────────────────────────── */}
      <div className="filter-bar">
        <div className="search-wrap">
          <span className="search-icon"><Search size={15} /></span>
          <input
            className="form-input search-input"
            placeholder="Search rooms…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select
          className="form-select"
          style={{ height: 38 }}
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          className="form-select"
          style={{ height: 38 }}
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
        >
          <option value="">All Types</option>
          {ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* ── Loading ───────────────────────────────────────── */}
      {listAsync.isPending && (
        <div className="rooms-grid">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="room-card" style={{ padding: 20 }}>
              <div className="skeleton skeleton-title" style={{ marginBottom: 12 }} />
              <div className="skeleton skeleton-text" style={{ width: '60%', marginBottom: 8 }} />
              <div className="skeleton skeleton-text" style={{ width: '40%' }} />
            </div>
          ))}
        </div>
      )}

      {/* ── Empty ────────────────────────────────────────── */}
      {!listAsync.isPending && filtered.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><BedDouble size={28} /></div>
            <h3>No rooms found</h3>
            <p>Try adjusting your filters or add a new room to get started.</p>
            {isAdmin && (
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openCreate}>
                <Plus size={16} /> Add First Room
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Rooms grid ───────────────────────────────────── */}
      {!listAsync.isPending && filtered.length > 0 && (
        <div className="rooms-grid">
          {filtered.map(room => (
            <div key={room._id} className="room-card">

              {/* Header */}
              <div className="room-card-header">
                <div>
                  <div className="room-number-badge">
                    Room <span>{room.number}</span>
                  </div>
                </div>
                <span className={`badge badge-${room.status}`}>{room.status}</span>
              </div>

              {/* Meta */}
              <div className="room-card-meta">
                <span className="room-meta-item">
                  <Building2 size={11} /> Floor {room.floor}
                </span>
                <span className="room-meta-item">
                  <Users size={11} /> {room.capacity} guest{room.capacity > 1 ? 's' : ''}
                </span>
                <span className="room-meta-item" style={{ textTransform: 'capitalize' }}>
                  {room.type}
                </span>
              </div>

              {/* Price */}
              <div className="room-price-row">
                <div className="room-price">
                  <DollarSign size={16} style={{ display: 'inline', verticalAlign: 'middle', marginBottom: 2 }} />
                  {room.pricePerNight.toLocaleString()}
                  <small>/night</small>
                </div>
              </div>

              {/* Description */}
              {room.description && (
                <div className="room-description">{room.description}</div>
              )}

              {/* Amenities */}
              {room.amenities.length > 0 && (
                <div className="room-amenities">
                  {room.amenities.slice(0, 4).map(a => (
                    <span key={a} className="amenity-tag">{a}</span>
                  ))}
                  {room.amenities.length > 4 && (
                    <span className="amenity-tag amenity-more">+{room.amenities.length - 4}</span>
                  )}
                </div>
              )}

              {/* Footer actions */}
              {isAdminOrReceptionist && (
                <div className="room-card-footer">
                  <select
                    className="status-select"
                    value={room.status}
                    onChange={e => handleStatusChange(room._id, e.target.value)}
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>

                  {isAdmin && (
                    <>
                      <button className="btn btn-icon" title="Edit room" onClick={() => openEdit(room)}>
                        <Pencil size={15} />
                      </button>
                      <button className="btn btn-icon" title="Delete room"
                        style={{ color: 'var(--clr-error)' }}
                        onClick={() => handleDelete(room._id, room.number)}>
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Create / Edit modal ───────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-text">
                <h2>{editing ? `Edit Room ${editing.number}` : 'Add New Room'}</h2>
                <p>{editing ? 'Update the room details below' : 'Fill in the details to create a room'}</p>
              </div>
              <button className="modal-close" onClick={() => setModal(false)}>
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

              <form onSubmit={handleSave} id="room-form">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      Room Number <span className="form-label-required">*</span>
                    </label>
                    <input className="form-input" value={form.number}
                      onChange={e => setForm(p => ({ ...p, number: e.target.value }))}
                      placeholder="101" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Type <span className="form-label-required">*</span>
                    </label>
                    <select className="form-select" value={form.type}
                      onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                      {ROOM_TYPES.map(t => (
                        <option key={t} value={t} style={{ textTransform: 'capitalize' }}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      Floor <span className="form-label-required">*</span>
                    </label>
                    <input className="form-input" type="number" min="1"
                      value={form.floor}
                      onChange={e => setForm(p => ({ ...p, floor: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Capacity <span className="form-label-required">*</span>
                    </label>
                    <input className="form-input" type="number" min="1" max="10"
                      value={form.capacity}
                      onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))} required />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Price per Night ($) <span className="form-label-required">*</span>
                  </label>
                  <input className="form-input" type="number" min="0"
                    value={form.pricePerNight}
                    onChange={e => setForm(p => ({ ...p, pricePerNight: e.target.value }))} required />
                </div>

                <div className="form-group">
                  <label className="form-label">Amenities</label>
                  <input className="form-input" value={form.amenities}
                    onChange={e => setForm(p => ({ ...p, amenities: e.target.value }))}
                    placeholder="WiFi, TV, AC, Minibar" />
                  <span className="form-hint">Comma-separated list</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" rows={2}
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Briefly describe the room…" />
                </div>
              </form>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button form="room-form" type="submit" className="btn btn-primary" disabled={saveAsync.isPending}>
                {saveAsync.isPending ? 'Saving…' : editing ? 'Update Room' : 'Create Room'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
