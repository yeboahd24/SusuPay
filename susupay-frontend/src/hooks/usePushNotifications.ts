import { useEffect, useRef } from 'react';
import api from '../api/axios';
import { API } from '../api/endpoints';
import { ENV } from '../config/env';
import { useAuth } from './useAuth';

/**
 * Convert a URL-safe base64 VAPID key to a Uint8Array for pushManager.subscribe().
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

/**
 * Auto-subscribes the current user for Web Push notifications.
 * Call this from authenticated layouts (CollectorLayout / ClientLayout).
 *
 * Flow:
 * 1. Wait for service worker to be ready
 * 2. Request Notification permission if not yet granted
 * 3. Subscribe via pushManager with VAPID public key
 * 4. Send subscription JSON to backend via PATCH profile endpoint
 */
export function usePushNotifications() {
  const { role } = useAuth();
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    if (!role) return;
    if (!ENV.VAPID_PUBLIC_KEY) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    attempted.current = true;

    (async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(ENV.VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
          });
        }

        const pushToken = JSON.stringify(subscription.toJSON());

        // Send to the correct profile endpoint based on role
        const endpoint = role === 'COLLECTOR' ? API.COLLECTORS.ME : API.CLIENTS.ME;
        await api.patch(endpoint, { push_token: pushToken });
      } catch (err) {
        console.warn('Push subscription failed:', err);
      }
    })();
  }, [role]);
}
