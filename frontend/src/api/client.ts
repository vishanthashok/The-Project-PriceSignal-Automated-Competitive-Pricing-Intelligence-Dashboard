import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// Auth
export const login = (email: string, password: string) =>
  api.post<{ access_token: string; token_type: string }>('/auth/login',
    new URLSearchParams({ username: email, password }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

export const register = (email: string, username: string, password: string) =>
  api.post('/auth/register', { email, username, password });

// Products
export const getProducts = () => api.get('/products');
export const getProduct = (id: number) => api.get(`/products/${id}`);
export const createProduct = (data: object) => api.post('/products', data);
export const deleteProduct = (id: number) => api.delete(`/products/${id}`);
export const triggerScrape = (id: number) => api.post(`/products/${id}/scrape`);

// Snapshots
export const getSnapshots = (id: number, params?: object) =>
  api.get(`/products/${id}/snapshots`, { params });

// Recommendations
export const getRecommendation = (id: number) =>
  api.get(`/products/${id}/recommendation`);

// Alerts
export const getAlerts = () => api.get('/alerts');
export const getUnreadAlerts = () => api.get('/alerts/unread');
export const markAlertRead = (id: number) => api.post(`/alerts/${id}/read`);
export const markAllRead = () => api.post('/alerts/mark-all-read');
