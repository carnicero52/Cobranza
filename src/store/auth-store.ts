import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '@/lib/types';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: AuthUser, token: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      setAuth: (user: AuthUser, token: string) =>
        set({ user, token, isAuthenticated: true, isLoading: false }),
      clearAuth: () =>
        set({ user: null, token: null, isAuthenticated: false, isLoading: false }),
      setLoading: (isLoading: boolean) => set({ isLoading }),
    }),
    {
      name: 'royalty-qr-auth',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
);
