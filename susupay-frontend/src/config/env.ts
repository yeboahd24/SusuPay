export const ENV = {
  API_URL: import.meta.env.VITE_API_URL as string || 'http://localhost:8001',
  VAPID_PUBLIC_KEY: import.meta.env.VITE_VAPID_PUBLIC_KEY as string || '',
} as const;
