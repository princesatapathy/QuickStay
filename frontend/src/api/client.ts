import axios from 'axios';

let _accessToken: string | null = null;
export const setAccessToken = (t: string | null) => { _accessToken = t; };

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (_accessToken) {
    config.headers.Authorization = `Bearer ${_accessToken}`;
  }
  return config;
});

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
          setAccessToken(newToken);
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        }
      } catch {
        setAccessToken(null);
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
