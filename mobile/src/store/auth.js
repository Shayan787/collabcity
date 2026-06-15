import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isLoading: true,

  init: async () => {
    try {
      const token = await SecureStore.getItemAsync('cc_token');
      const userStr = await SecureStore.getItemAsync('cc_user');
      if (token && userStr) {
        set({ token, user: JSON.parse(userStr), isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  login: async (user, token) => {
    await SecureStore.setItemAsync('cc_token', token);
    await SecureStore.setItemAsync('cc_user', JSON.stringify(user));
    set({ user, token });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('cc_token');
    await SecureStore.deleteItemAsync('cc_user');
    set({ user: null, token: null });
  },

  updateUser: async (updates) => {
    const updated = { ...get().user, ...updates };
    await SecureStore.setItemAsync('cc_user', JSON.stringify(updated));
    set({ user: updated });
  },
}));

export default useAuthStore;
