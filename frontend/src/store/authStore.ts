import { create } from 'zustand';
import api from '../utils/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'CLAIMS_STAFF' | 'SUPPORT_STAFF' | 'AUDITOR';
  avatar?: string;
  twoFactorEnabled: boolean;
}

interface AuthState {
  token: string | null;
  user: User | null;
  requires2FA: boolean;
  tempToken: string | null;
  email2FA: string | null;
  loading: boolean;
  error: string | null;
  
  login: (email: string, password: string, role?: string) => Promise<{ requires2FA: boolean }>;
  verify2FA: (code: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  loadFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  requires2FA: false,
  tempToken: null,
  email2FA: null,
  loading: false,
  error: null,

  loadFromStorage: () => {
    const token = localStorage.getItem('healthpass_token');
    const userJson = localStorage.getItem('healthpass_user');
    if (token && userJson) {
      set({ token, user: JSON.parse(userJson), error: null });
    }
  },

  login: async (email, password, role) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/auth/login', { email, password, role });
      const data = response.data;

      if (data.requires2FA) {
        set({
          requires2FA: true,
          tempToken: data.tempToken,
          email2FA: data.email,
          loading: false
        });
        return { requires2FA: true };
      }

      // Successful direct login
      localStorage.setItem('healthpass_token', data.token);
      localStorage.setItem('healthpass_user', JSON.stringify(data.user));
      set({
        token: data.token,
        user: data.user,
        requires2FA: false,
        tempToken: null,
        email2FA: null,
        loading: false
      });
      return { requires2FA: false };

    } catch (error: any) {
      const errMsg = error.response?.data?.error || 'Authentication failed. Please verify credentials.';
      set({ error: errMsg, loading: false });
      throw new Error(errMsg);
    }
  },

  verify2FA: async (code) => {
    set({ loading: true, error: null });
    const { tempToken } = get();
    try {
      const response = await api.post('/auth/login/verify-2fa', { tempToken, code });
      const data = response.data;

      localStorage.setItem('healthpass_token', data.token);
      localStorage.setItem('healthpass_user', JSON.stringify(data.user));
      set({
        token: data.token,
        user: data.user,
        requires2FA: false,
        tempToken: null,
        email2FA: null,
        loading: false
      });
    } catch (error: any) {
      const errMsg = error.response?.data?.error || 'Invalid two-factor code.';
      set({ error: errMsg, loading: false });
      throw new Error(errMsg);
    }
  },

  logout: () => {
    localStorage.removeItem('healthpass_token');
    localStorage.removeItem('healthpass_user');
    set({
      token: null,
      user: null,
      requires2FA: false,
      tempToken: null,
      email2FA: null,
      error: null
    });
  },

  clearError: () => set({ error: null })
}));
