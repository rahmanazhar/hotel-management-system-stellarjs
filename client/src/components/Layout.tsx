import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, BedDouble, CalendarDays, Users, LogOut, Building2 } from 'lucide-react';

interface Props {
  user: { name: string; email: string; role: string };
  onLogout: () => void;
  children: React.ReactNode;
}

const NAV = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/rooms',     icon: BedDouble,       label: 'Rooms' },
  { to: '/bookings',  icon: CalendarDays,    label: 'Bookings' },
  { to: '/customers', icon: Users,           label: 'Customers', staffOnly: true },
];

const PAGE_META: Record<string, { title: string; desc: string }> = {
  '/':          { title: 'Dashboard',  desc: 'Hotel overview and key metrics' },
  '/rooms':     { title: 'Rooms',      desc: 'Manage room inventory and availability' },
  '/bookings':  { title: 'Bookings',   desc: 'Reservations, check-ins and check-outs' },
  '/customers': { title: 'Customers',  desc: 'Guest profiles and account management' },
};

export default function Layout({ user, onLogout, children }: Props) {
  const location = useLocation();
  const isStaff  = user.role === 'admin' || user.role === 'receptionist';
  const meta     = PAGE_META[location.pathname] ?? { title: 'HotelOS', desc: '' };

  return (
    <div className="layout">

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Building2 size={19} />
          </div>
          <div className="sidebar-logo-text">
            <h2>HotelOS</h2>
            <p>Management Suite</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV
            .filter(n => !n.staffOnly || isStaff)
            .map(n => {
              const Icon = n.icon;
              return (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.exact}
                  className={({ isActive }) => isActive ? 'active' : ''}
                >
                  <span className="nav-icon"><Icon size={17} /></span>
                  {n.label}
                </NavLink>
              );
            })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-user-info">
              <p>{user.name}</p>
              <span>{user.role}</span>
            </div>
            <button className="sidebar-logout" onClick={onLogout} title="Sign out">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main area ──────────────────────────────────────── */}
      <div className="main-area">
        <header className="topbar">
          <div className="topbar-title">
            <h1>{meta.title}</h1>
            {meta.desc && <p>{meta.desc}</p>}
          </div>
          <div className="topbar-actions">
            <span className={`badge badge-${user.role}`}>{user.role}</span>
          </div>
        </header>

        <main className="main-content">
          {children}
        </main>
      </div>

    </div>
  );
}
