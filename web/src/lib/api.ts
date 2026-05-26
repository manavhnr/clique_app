import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5001/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('clique_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('clique_token');
      localStorage.removeItem('clique_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
