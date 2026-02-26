import axios, { AxiosRequestConfig } from 'axios';

const BASE_URL = '/api';

function getToken(): string | null {
  try {
    const raw = localStorage.getItem('hotel_auth');
    if (!raw) return null;
    return JSON.parse(raw)?.token || null;
  } catch {
    return null;
  }
}

function headers(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  get: <T = any>(path: string, params?: Record<string, any>) =>
    axios.get<T>(`${BASE_URL}${path}`, { headers: headers(), params }),

  post: <T = any>(path: string, data?: any) =>
    axios.post<T>(`${BASE_URL}${path}`, data, { headers: headers() }),

  put: <T = any>(path: string, data?: any) =>
    axios.put<T>(`${BASE_URL}${path}`, data, { headers: headers() }),

  delete: <T = any>(path: string) =>
    axios.delete<T>(`${BASE_URL}${path}`, { headers: headers() }),
};
