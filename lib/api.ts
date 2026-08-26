// lib/api.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

// ─── Config ─────────────────────────────────────────────────────────────────
const _rawUrl = process.env.EXPO_PUBLIC_API_URL ?? 'https://365microfinance.mccoln.com/api';
export const API_BASE_URL = _rawUrl.replace(/\/+$/, '');

const STORAGE_KEYS = {
  ACCESS:    'masco_access_token',
  REFRESH:   'masco_refresh_token',
  USER:      'masco_user',
  OFFICE_ID: 'masco_office_id',
} as const;

// ─── Token storage ───────────────────────────────────────────────────────────
export const TokenStorage = {
  async getAccess():  Promise<string | null> { try { return await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS);  } catch { return null; } },
  async getRefresh(): Promise<string | null> { try { return await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH); } catch { return null; } },

  async setTokens(access: unknown, refresh: unknown): Promise<void> {
    const a = typeof access  === 'string' ? access  : String(access  ?? '');
    const r = typeof refresh === 'string' ? refresh : String(refresh ?? '');
    if (!a || !r) throw new Error(`Invalid tokens — access:"${a}" refresh:"${r}"`);
    await Promise.all([
      SecureStore.setItemAsync(STORAGE_KEYS.ACCESS,  a),
      SecureStore.setItemAsync(STORAGE_KEYS.REFRESH, r),
    ]);
  },

  async setUser(user: unknown): Promise<void> {
    const s = typeof user === 'string' ? user : JSON.stringify(user ?? {});
    await SecureStore.setItemAsync(STORAGE_KEYS.USER, s);
  },

  async getUser(): Promise<object | null> {
    try { const r = await SecureStore.getItemAsync(STORAGE_KEYS.USER); return r ? JSON.parse(r) : null; }
    catch { return null; }
  },

  async setOfficeId(id: unknown): Promise<void> {
    if (id === null || id === undefined) return;
    await SecureStore.setItemAsync(STORAGE_KEYS.OFFICE_ID, String(id));
  },

  async getOfficeId(): Promise<string | null> {
    try { return await SecureStore.getItemAsync(STORAGE_KEYS.OFFICE_ID); } catch { return null; }
  },

  async clear(): Promise<void> {
    await Promise.all(Object.values(STORAGE_KEYS).map(k => SecureStore.deleteItemAsync(k).catch(() => {})));
  },
};

// ─── Axios instance ──────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

// ─── Request interceptor ─────────────────────────────────────────────────────
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const [token, officeId] = await Promise.all([
      TokenStorage.getAccess(),
      TokenStorage.getOfficeId(),
    ]);
    if (token)    config.headers.Authorization = `Bearer ${token}`;
    if (officeId) config.headers['X-Office-Id'] = officeId;
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor ────────────────────────────────────────────────────
let isRefreshing = false;
let refreshQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null = null) {
  refreshQueue.forEach(({ resolve, reject }) => error ? reject(error) : resolve(token!));
  refreshQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Never intercept auth endpoints — let caller handle their errors directly
    const url = originalRequest?.url || '';
    const isAuthEndpoint = (
      url.includes('/auth/login')   ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/logout')
    );

    // Only attempt refresh for 401s on non-auth endpoints
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await TokenStorage.getRefresh();
        if (!refreshToken) {
          // No refresh token — clear everything and redirect to login
          await TokenStorage.clear();
          authEventEmitter.emit('logout');
          return Promise.reject(error);
        }

        // Use plain axios (not our instance) to avoid interceptor loop
        const { data } = await axios.post(
          `${API_BASE_URL}/auth/refresh/`,
          { refresh: refreshToken },
          { timeout: 10000 }
        );

        if (!data?.access) throw new Error('Refresh returned no access token');

        await TokenStorage.setTokens(data.access, refreshToken);
        processQueue(null, data.access);
        originalRequest.headers.Authorization = `Bearer ${data.access}`;
        return api(originalRequest);

      } catch (refreshError: any) {
        processQueue(refreshError, null);

        // Refresh failed — clear tokens and log out
        await TokenStorage.clear();
        authEventEmitter.emit('logout');
        return Promise.reject(refreshError);

      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ─── Auth event emitter ──────────────────────────────────────────────────────
type Handler = () => void;
const _listeners: Handler[] = [];
export const authEventEmitter = {
  on(event: 'logout', fn: Handler) {
    _listeners.push(fn);
    return () => {
      const i = _listeners.indexOf(fn);
      if (i !== -1) _listeners.splice(i, 1);
    };
  },
  emit(event: 'logout') {
    _listeners.forEach(fn => fn());
  },
};

export default api;
