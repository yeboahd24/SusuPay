import axiosLib from 'axios';
import { ENV } from '../config/env';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '../lib/token';
import { API } from './endpoints';

const api = axiosLib.create({
  baseURL: ENV.API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401 refresh queue pattern
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token!);
    }
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Don't try to refresh the refresh call itself
    if (originalRequest.url?.includes('/auth/refresh')) {
      clearTokens();
      window.location.href = '/';
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      isRefreshing = false;
      clearTokens();
      window.location.href = '/';
      return Promise.reject(error);
    }

    try {
      // Use raw axios (not the instance) to avoid interceptor loop
      const { data } = await axiosLib.post(
        `${ENV.API_URL}${API.AUTH.REFRESH}`,
        { refresh_token: refreshToken },
      );
      setTokens(data.access_token, data.refresh_token);
      processQueue(null, data.access_token);
      originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      clearTokens();
      window.location.href = '/';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;
