import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from './theme';

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('cc_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {}
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      await SecureStore.deleteItemAsync('cc_token');
      await SecureStore.deleteItemAsync('cc_user');
    }
    return Promise.reject(err);
  }
);

export default api;
