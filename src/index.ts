import 'dotenv/config';
import mongoose from 'mongoose';
import { createServer } from '@rahmanazhar/stellar-js';

import { authenticate, requireRole, register, login, getMe, createAdminUser } from './services/authHandler';
import { getAllRooms, getRoomById, createRoom, updateRoom, deleteRoom, getRoomAvailability } from './services/roomHandler';
import { getAllCustomers, getCustomerById, getMyProfile, createCustomer, updateCustomer, deleteCustomer } from './services/customerHandler';
import { getAllBookings, getBookingById, createBooking, updateBookingStatus, deleteBooking, getBookingStats } from './services/bookingHandler';

const PORT = parseInt(process.env.PORT || '3000', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hotel_management';
const JWT_SECRET = process.env.JWT_SECRET || 'hotel-stellar-super-secret-jwt-key-2024';

async function bootstrap(): Promise<void> {
  // 1. Connect to MongoDB using the hotel system's own mongoose instance
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Database connected');

  // 2. Seed admin user
  await createAdminUser('Administrator', 'admin@hotel.com', 'Admin@1234');
  console.log('✅ Admin user ready (admin@hotel.com / Admin@1234)');

  // 3. Create StellarJS server
  const server = createServer({
    port: PORT,
    auth: {
      jwtSecret: JWT_SECRET,
      tokenExpiration: '24h',
    },
    security: {
      helmet: false,       // Disabled for API development
      rateLimit: {
        windowMs: 15 * 60 * 1000,
        max: 500,
      },
      xss: true,
      noSqlInjection: true,
      hpp: true,
      sanitization: false, // Disabled: validator.escape() corrupts data
    },
    cors: {
      origins: '*',
      credentials: false,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    },
    audit: { enabled: false },
  });

  // 4. Health check (public)
  server.registerService({
    name: 'health',
    routes: [
      {
        path: '',
        method: 'GET',
        handler: (_req, res) => {
          const health = server.getHealth();
          res.json({ status: 'ok', uptime: health.uptime, services: health.services, timestamp: new Date().toISOString() });
        },
      },
    ],
  });

  // 5. Auth routes (public)
  server.registerService({
    name: 'auth',
    routes: [
      { path: '/register', method: 'POST', handler: register },
      { path: '/login', method: 'POST', handler: login },
      {
        path: '/me',
        method: 'GET',
        middleware: [authenticate],
        handler: getMe,
      },
    ],
  });

  // 6. Room routes
  server.registerService({
    name: 'rooms',
    routes: [
      // Public: list and availability
      { path: '/', method: 'GET', middleware: [authenticate], handler: getAllRooms },
      { path: '/availability', method: 'GET', middleware: [authenticate], handler: getRoomAvailability },
      { path: '/:id', method: 'GET', middleware: [authenticate], handler: getRoomById },
      // Admin only: create, update, delete
      {
        path: '/',
        method: 'POST',
        middleware: [authenticate, requireRole('admin')],
        handler: createRoom,
      },
      {
        path: '/:id',
        method: 'PUT',
        middleware: [authenticate, requireRole('admin', 'receptionist')],
        handler: updateRoom,
      },
      {
        path: '/:id',
        method: 'DELETE',
        middleware: [authenticate, requireRole('admin')],
        handler: deleteRoom,
      },
    ],
  });

  // 7. Customer routes
  server.registerService({
    name: 'customers',
    routes: [
      {
        path: '/me',
        method: 'GET',
        middleware: [authenticate],
        handler: getMyProfile,
      },
      {
        path: '/',
        method: 'GET',
        middleware: [authenticate, requireRole('admin', 'receptionist')],
        handler: getAllCustomers,
      },
      {
        path: '/:id',
        method: 'GET',
        middleware: [authenticate],
        handler: getCustomerById,
      },
      {
        path: '/',
        method: 'POST',
        middleware: [authenticate, requireRole('admin', 'receptionist')],
        handler: createCustomer,
      },
      {
        path: '/:id',
        method: 'PUT',
        middleware: [authenticate],
        handler: updateCustomer,
      },
      {
        path: '/:id',
        method: 'DELETE',
        middleware: [authenticate, requireRole('admin')],
        handler: deleteCustomer,
      },
    ],
  });

  // 8. Booking routes
  server.registerService({
    name: 'bookings',
    routes: [
      {
        path: '/stats',
        method: 'GET',
        middleware: [authenticate, requireRole('admin', 'receptionist')],
        handler: getBookingStats,
      },
      {
        path: '/',
        method: 'GET',
        middleware: [authenticate],
        handler: getAllBookings,
      },
      {
        path: '/:id',
        method: 'GET',
        middleware: [authenticate],
        handler: getBookingById,
      },
      {
        path: '/',
        method: 'POST',
        middleware: [authenticate],
        handler: createBooking,
      },
      {
        path: '/:id',
        method: 'PUT',
        middleware: [authenticate],
        handler: updateBookingStatus,
      },
      {
        path: '/:id',
        method: 'DELETE',
        middleware: [authenticate, requireRole('admin')],
        handler: deleteBooking,
      },
    ],
  });

  // 9. Start server
  await server.start();

  console.log(`\n🏨 Hotel Management System`);
  console.log(`📡 API running at: http://localhost:${PORT}`);
  console.log(`\n📋 Endpoints:`);
  console.log(`  POST  /api/auth/register`);
  console.log(`  POST  /api/auth/login`);
  console.log(`  GET   /api/auth/me`);
  console.log(`  GET   /api/rooms`);
  console.log(`  GET   /api/rooms/availability?checkIn=&checkOut=`);
  console.log(`  POST  /api/rooms            [admin]`);
  console.log(`  PUT   /api/rooms/:id        [admin/receptionist]`);
  console.log(`  DELETE /api/rooms/:id       [admin]`);
  console.log(`  GET   /api/customers        [admin/receptionist]`);
  console.log(`  GET   /api/customers/me`);
  console.log(`  POST  /api/customers        [admin/receptionist]`);
  console.log(`  PUT   /api/customers/:id`);
  console.log(`  DELETE /api/customers/:id   [admin]`);
  console.log(`  GET   /api/bookings`);
  console.log(`  POST  /api/bookings`);
  console.log(`  PUT   /api/bookings/:id`);
  console.log(`  DELETE /api/bookings/:id    [admin]`);
  console.log(`  GET   /api/bookings/stats   [admin/receptionist]`);
  console.log(`  GET   /api/health`);
}

bootstrap().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
