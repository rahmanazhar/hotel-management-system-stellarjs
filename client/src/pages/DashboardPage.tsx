import React, { useEffect, useState } from 'react';
import { useAsync } from '@rahmanazhar/stellar-js/dist/hooks';
import { roomService, bookingService } from '../api/services';
import { BedDouble, CheckCircle2, Key, DollarSign, CalendarDays } from 'lucide-react';

interface Stats {
  totalRooms:       number;
  availableRooms:   number;
  occupiedRooms:    number;
  totalRevenue:     number;
  bookingsByStatus: Record<string, number>;
}

const BOOKING_STATUSES = ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'] as const;

const STATUS_COLORS: Record<string, string> = {
  pending:     'var(--clr-warning)',
  confirmed:   'var(--clr-brand-600)',
  checked_in:  'var(--clr-success)',
  checked_out: 'var(--clr-slate-400)',
  cancelled:   'var(--clr-error)',
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  const roomsAsync = useAsync(() => roomService.getAll({ limit: '200' }));
  const statsAsync = useAsync(bookingService.getStats);

  useEffect(() => {
    Promise.all([roomsAsync.execute(), statsAsync.execute()])
      .then(([rooms, bookingStats]) => {
        const roomData: any[] = rooms.data || [];
        setStats({
          totalRooms:       rooms.pagination?.total ?? roomData.length,
          availableRooms:   roomData.filter((r: any) => r.status === 'available').length,
          occupiedRooms:    roomData.filter((r: any) => r.status === 'occupied').length,
          totalRevenue:     bookingStats.data?.revenue?.totalRevenue ?? 0,
          bookingsByStatus: bookingStats.data?.byStatus ?? {},
        });
      })
      .catch(() => {});
  }, []);

  const loading = roomsAsync.isPending || statsAsync.isPending;

  const KPI_CARDS = stats ? [
    {
      label:     'Total Rooms',
      value:     stats.totalRooms,
      icon:      <BedDouble size={22} />,
      colorCls:  'purple',
      sub:       'In the property',
    },
    {
      label:     'Available',
      value:     stats.availableRooms,
      icon:      <CheckCircle2 size={22} />,
      colorCls:  'green',
      sub:       `${stats.totalRooms ? Math.round((stats.availableRooms / stats.totalRooms) * 100) : 0}% occupancy rate`,
    },
    {
      label:     'Occupied',
      value:     stats.occupiedRooms,
      icon:      <Key size={22} />,
      colorCls:  'blue',
      sub:       'Guests checked in',
    },
    {
      label:     'Total Revenue',
      value:     `$${stats.totalRevenue.toLocaleString()}`,
      icon:      <DollarSign size={22} />,
      colorCls:  'amber',
      sub:       'All-time bookings',
    },
  ] : [];

  return (
    <div>
      {loading && (
        <div>
          <div className="stat-grid" style={{ marginBottom: 24 }}>
            {[1,2,3,4].map(i => (
              <div key={i} className="stat-card">
                <div className="skeleton skeleton-card" style={{ height: 80 }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {stats && (
        <>
          {/* ── KPI row ────────────────────────────────────── */}
          <div className="stat-grid">
            {KPI_CARDS.map(card => (
              <div key={card.label} className="stat-card">
                <div className="stat-card-top">
                  <div>
                    <div className="stat-card-label">{card.label}</div>
                  </div>
                  <div className={`stat-card-icon ${card.colorCls}`}>
                    {card.icon}
                  </div>
                </div>
                <div className="stat-card-value">{card.value}</div>
                <div className="stat-card-sub">{card.sub}</div>
              </div>
            ))}
          </div>

          {/* ── Bookings by status ─────────────────────────── */}
          <div className="card">
            <div className="card-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="section-title-icon"><CalendarDays size={14} /></span>
                Bookings by Status
              </h3>
            </div>
            <div className="card-body">
              <div className="booking-status-grid">
                {BOOKING_STATUSES.map(status => (
                  <div key={status} className="booking-status-item">
                    <div
                      className="booking-status-count"
                      style={{ color: STATUS_COLORS[status] }}
                    >
                      {stats.bookingsByStatus[status] ?? 0}
                    </div>
                    <span className={`badge badge-${status}`}>
                      {status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
