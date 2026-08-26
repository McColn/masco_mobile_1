import { create } from 'zustand';
import type { User } from '@/lib/types';
import { TokenStorage } from '@/lib/api';
import { AuthService } from '@/lib/services';
import axios from 'axios';
import { API_BASE_URL } from '@/lib/api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (username, password) => {
    // Toggle isLoading so the login button shows its ActivityIndicator
    // while the request is in flight; always reset on error so the user
    // can retry.
    set({ isLoading: true });
    try {
      const data = await AuthService.login({ username, password });

      const accessToken  = data?.access  || data?.access_token  || null;
      const refreshToken = data?.refresh || data?.refresh_token || null;

      if (!accessToken || typeof accessToken !== 'string') {
        throw new Error(`Server did not return an access token. Got: ${JSON.stringify(data)}`);
      }
      if (!refreshToken || typeof refreshToken !== 'string') {
        throw new Error(`Server did not return a refresh token. Got: ${JSON.stringify(data)}`);
      }

      await TokenStorage.setTokens(accessToken, refreshToken);

      const user: User = data.user ?? {
        id: 0, username, full_name: username, email: '',
        phone: '', employee_id: '', role: '',
        is_superuser: false, is_active: true,
        office: '', office_id: null,
      };
      await TokenStorage.setUser(user);

      set({ user, accessToken, refreshToken, isAuthenticated: true, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;   // let the login screen catch and toast this
    }
  },

  logout: async () => {
    const { refreshToken } = get();
    // Fire-and-forget — don't wait, don't throw
    if (refreshToken) {
      AuthService.logout(refreshToken).catch(() => {});
    }
    await TokenStorage.clear();
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
    // Redirect to signin after clearing state
    try {
      const { router } = require('expo-router');
      router.replace('/(auth)');
    } catch (_) {}
  },

  restoreSession: async () => {
    try {
      const [access, refresh, user] = await Promise.all([
        TokenStorage.getAccess(),
        TokenStorage.getRefresh(),
        TokenStorage.getUser(),
      ]);

      if (!access || !refresh) {
        set({ isLoading: false });
        return;
      }

      // Try to refresh immediately — validates both tokens are still good
      try {
        const { data } = await axios.post(
          `${API_BASE_URL}/auth/refresh/`,
          { refresh },
          { timeout: 10000 }
        );

        if (data?.access) {
          await TokenStorage.setTokens(data.access, refresh);
          set({
            user: (user as User) ?? null,
            accessToken: data.access,
            refreshToken: refresh,
            isAuthenticated: true,
            isLoading: false,
          });
          return;
        }
      } catch {
        // Refresh token expired — clear and go to login
        await TokenStorage.clear();
      }
    } catch (e) {
      console.warn('[AUTH] restoreSession error:', e);
      await TokenStorage.clear().catch(() => {});
    }

    set({ isLoading: false });
  },

  updateUser: (user: User) => set({ user }),
}));
