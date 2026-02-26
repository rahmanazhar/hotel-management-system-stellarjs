import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
// Import from compiled subpath files to avoid pulling in server-side Node.js code
import { StellarApp } from '@rahmanazhar/stellar-js/dist/core/StellarApp';
import { useLocalStorage } from '@rahmanazhar/stellar-js/dist/hooks';

import { authService, roomService, customerService, bookingService } from './api/services';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import RoomsPage from './pages/RoomsPage';
import BookingsPage from './pages/BookingsPage';
import CustomersPage from './pages/CustomersPage';

// StellarJS config — services registered here for useService hook
const stellarConfig = {
  apiUrl: 'http://localhost:3000',
  auth: { jwtSecret: '' },
  services: {
    auth: authService,
    rooms: roomService,
    customers: customerService,
    bookings: bookingService,
  },
};

interface AuthState {
  token: string;
  user: { id: string; name: string; email: string; role: string };
}

export default function App() {
  const [auth, setAuth, clearAuth] = useLocalStorage<AuthState | null>('hotel_auth', null);

  function handleLogin(result: AuthState) {
    setAuth(result);
  }

  function handleLogout() {
    clearAuth();
  }

  return (
    <StellarApp config={stellarConfig}>
      {!auth ? (
        <LoginPage onLogin={handleLogin} />
      ) : (
        <Layout user={auth.user} onLogout={handleLogout}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/rooms" element={<RoomsPage userRole={auth.user.role} />} />
            <Route path="/bookings" element={<BookingsPage userRole={auth.user.role} userId={auth.user.id} />} />
            {(auth.user.role === 'admin' || auth.user.role === 'receptionist') && (
              <Route path="/customers" element={<CustomersPage userRole={auth.user.role} />} />
            )}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      )}
    </StellarApp>
  );
}
