import axios from 'axios';

// In dev: Vite proxy handles /api → localhost:8080
// In prod: set VITE_API_BASE_URL=https://quickstay-api-princesatapathy.onrender.com/api/v1
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  withCredentials: true,
});

// Attach access token from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const base = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
        const resp = await axios.post(`${base}/auth/refresh`, {}, { withCredentials: true });
        const newToken = resp.data?.data?.accessToken;
        if (newToken) {
          localStorage.setItem('accessToken', newToken);
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        }
      } catch {
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
