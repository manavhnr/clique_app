import axios, { AxiosError, AxiosRequestConfig } from 'axios';

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

function forceLogout(): void {
  localStorage.removeItem('clique_token');
  localStorage.removeItem('clique_user');
  localStorage.removeItem('clique_refresh');
  window.location.href = '/login';
}

// Single in-flight refresh shared by all concurrent 401s
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('clique_refresh');
  if (!refreshToken) return null;
  try {
    // Bare axios (not `api`) to avoid recursive interceptors
    const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
    const newToken = data?.data?.token as string | undefined;
    const newRefresh = data?.data?.refreshToken as string | undefined;
    if (!newToken) return null;
    localStorage.setItem('clique_token', newToken);
    if (newRefresh) localStorage.setItem('clique_refresh', newRefresh);
    return newToken;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const original = err.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined;

    if (
      err.response?.status === 401 &&
      typeof window !== 'undefined' &&
      original &&
      !original._retried &&
      // don't try to refresh the refresh call itself
      !original.url?.includes('/auth/refresh')
    ) {
      original._retried = true;
      refreshPromise = refreshPromise ?? refreshAccessToken();
      const newToken = await refreshPromise;
      refreshPromise = null;

      if (newToken) {
        original.headers = { ...original.headers, Authorization: `Bearer ${newToken}` };
        return api(original);
      }
      forceLogout();
    }

    return Promise.reject(err);
  }
);

export default api;
