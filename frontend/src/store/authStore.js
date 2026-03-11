import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user, token) => {
        set({
          user,
          token,
          isAuthenticated: true,
        });
      },

      updateUser: (userData) => {
        set({
          user: { ...get().user, ...userData },
        });
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },

      isAdmin: () => get().user?.role === 'admin',
      isDelivery: () => get().user?.role === 'delivery',
      isCustomer: () => get().user?.role === 'customer',
    }),
    {
      name: 'dum-wok-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
