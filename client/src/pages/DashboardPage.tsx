import React, { useEffect, useState } from 'react';
import { useAsync } from '@rahmanazhar/stellar-js/dist/hooks';
import { roomService } from '../api/services';
import { bookingService } from '../api/services';

interface Stats {
  totalRooms: number;
  availableRooms: number;
  occupiedRooms: number;
  totalRevenue: number;
  bookingsByStatus: Record<string, number>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  const roomsAsync = useAsync(() => roomService.getAll({ limit: '100' }));
  const statsAsync = useAsync(bookingService.getStats);

  useEffect(() => {
    Promise.all([roomsAsync.execute(), statsAsync.execute()]).then(([rooms, bookingStats]) => {
      const roomData: any[] = rooms.data || [];
      setStats({
        totalRooms: rooms.pagination?.total || roomData.length,
        availableRooms: roomData.filter((r: any) => r.status === 'available').length,
        occupiedRooms: roomData.filter((r: any) => r.status === 'occupied').length,
        totalRevenue: bookingStats.data?.revenue?.totalRevenue || 0,
        bookingsByStatus: bookingStats.data?.byStatus || {},
      });
    }).catch(() => {});
  }, []);

  const loading = roomsAsync.isPending || statsAsync.isPending;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Overview of hotel operations</p>
        </div>
      </div>

      {loading && <div className="loading">Loading stats…</div>}

      {stats && (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-icon">🏨</div>
              <div className="stat-value">{stats.totalRooms}</div>
              <div className="stat-label">Total Rooms</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">✅</div>
              <div className="stat-value" style={{ color: '#16a34a' }}>{stats.availableRooms}</div>
              <div className="stat-label">Available</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🔑</div>
              <div className="stat-value" style={{ color: '#1d4ed8' }}>{stats.occupiedRooms}</div>
              <div className="stat-label">Occupied</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-value" style={{ color: '#e94560' }}>
                ${stats.totalRevenue.toLocaleString()}
              </div>
              <div className="stat-label">Total Revenue</div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 16, fontWeight: 700 }}>Bookings by Status</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
              {['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'].map(status => (
                <div key={status} style={{
                  textAlign: 'center', padding: '16px 8px',
                  background: '#f9fafb', borderRadius: 8,
                }}>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>
                    {stats.bookingsByStatus[status] || 0}
                  </div>
                  <span className={`badge badge-${status}`} style={{ marginTop: 6 }}>
                    {status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
