import { api } from './client';

// ── Auth ──────────────────────────────────────────────────────────────
export const authService = {
  login: async (data: { email: string; password: string }) => {
    const res = await api.post('/auth/login', data);
    return res.data;
  },
  register: async (data: {
    name: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  }) => {
    const res = await api.post('/auth/register', data);
    return res.data;
  },
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
};

// ── Rooms ─────────────────────────────────────────────────────────────
export const roomService = {
  getAll: async (params?: Record<string, any>) => {
    const res = await api.get('/rooms', params);
    return res.data;
  },
  getById: async (id: string) => {
    const res = await api.get(`/rooms/${id}`);
    return res.data;
  },
  getAvailability: async (checkIn: string, checkOut: string) => {
    const res = await api.get('/rooms/availability', { checkIn, checkOut });
    return res.data;
  },
  create: async (data: Record<string, any>) => {
    const res = await api.post('/rooms', data);
    return res.data;
  },
  update: async (id: string, data: Record<string, any>) => {
    const res = await api.put(`/rooms/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await api.delete(`/rooms/${id}`);
    return res.data;
  },
};

// ── Customers ─────────────────────────────────────────────────────────
export const customerService = {
  getAll: async (params?: Record<string, any>) => {
    const res = await api.get('/customers', params);
    return res.data;
  },
  getById: async (id: string) => {
    const res = await api.get(`/customers/${id}`);
    return res.data;
  },
  getMe: async () => {
    const res = await api.get('/customers/me');
    return res.data;
  },
  create: async (data: Record<string, any>) => {
    const res = await api.post('/customers', data);
    return res.data;
  },
  update: async (id: string, data: Record<string, any>) => {
    const res = await api.put(`/customers/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await api.delete(`/customers/${id}`);
    return res.data;
  },
};

// ── Bookings ──────────────────────────────────────────────────────────
export const bookingService = {
  getAll: async (params?: Record<string, any>) => {
    const res = await api.get('/bookings', params);
    return res.data;
  },
  getById: async (id: string) => {
    const res = await api.get(`/bookings/${id}`);
    return res.data;
  },
  getStats: async () => {
    const res = await api.get('/bookings/stats');
    return res.data;
  },
  create: async (data: Record<string, any>) => {
    const res = await api.post('/bookings', data);
    return res.data;
  },
  updateStatus: async (id: string, status: string, reason?: string) => {
    const res = await api.put(`/bookings/${id}`, {
      status,
      cancellationReason: reason,
    });
    return res.data;
  },
  delete: async (id: string) => {
    const res = await api.delete(`/bookings/${id}`);
    return res.data;
  },
};
