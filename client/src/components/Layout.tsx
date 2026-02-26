import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

interface Props {
  user: { name: string; email: string; role: string };
  onLogout: () => void;
  children: React.ReactNode;
}

const NAV = [
  { to: '/', icon: '📊', label: 'Dashboard' },
  { to: '/rooms', icon: '🏨', label: 'Rooms' },
  { to: '/bookings', icon: '📋', label: 'Bookings' },
  { to: '/customers', icon: '👥', label: 'Customers', staffOnly: true },
];

export default function Layout({ user, onLogout, children }: Props) {
  const isStaff = user.role === 'admin' || user.role === 'receptionist';

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h2>🏨 Hotel System</h2>
          <p>Management Portal</p>
        </div>
        <nav className="sidebar-nav">
          {NAV
            .filter(n => !n.staffOnly || isStaff)
            .map(n => (
              <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => isActive ? 'active' : ''}>
                <span className="icon">{n.icon}</span>
                {n.label}
              </NavLink>
            ))}
        </nav>
        <div className="sidebar-user">
          <div className="avatar">{user.name.charAt(0).toUpperCase()}</div>
          <div className="info">
            <p>{user.name}</p>
            <span>{user.role}</span>
          </div>
          <button onClick={onLogout} title="Sign out">⏏</button>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
