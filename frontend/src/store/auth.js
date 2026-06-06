import { create } from 'zustand';

const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isLoading: true,

  init: () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('cc_token');
    const userStr = localStorage.getItem('cc_user');
    if (token && userStr) {
      try {
        set({ token, user: JSON.parse(userStr), isLoading: false });
      } catch {
        set({ isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  },

  login: (user, token) => {
    localStorage.setItem('cc_token', token);
    localStorage.setItem('cc_user', JSON.stringify(user));
    set({ user, token });
  },

  logout: () => {
    localStorage.removeItem('cc_token');
    localStorage.removeItem('cc_user');
    set({ user: null, token: null });
  },

  updateUser: (updates) => {
    const updated = { ...get().user, ...updates };
    localStorage.setItem('cc_user', JSON.stringify(updated));
    set({ user: updated });
  },
}));

export default useAuthStore;
