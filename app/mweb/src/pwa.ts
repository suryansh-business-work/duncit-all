import { apolloClient } from './apollo';
import { gql } from '@apollo/client';

const PUSH_CONFIG = gql`
  query PushConfig {
    pushConfig {
      publicKey
    }
  }
`;

const SAVE_SUB = gql`
  mutation SavePushSubscription($input: PushSubscriptionInput!) {
    savePushSubscription(input: $input)
  }
`;

const DELETE_SUB = gql`
  mutation DeletePushSubscription($endpoint: String!) {
    deletePushSubscription(endpoint: $endpoint)
  }
`;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = globalThis.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.codePointAt(i) ?? 0;
  return out;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCodePoint(bytes[i]);
  return globalThis.btoa(binary);
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js?v=20260508-slider', { scope: '/' });
    await reg.update();
    return reg;
  } catch (e) {
     
    console.warn('SW registration failed', e);
    return null;
  }
}

export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in globalThis &&
    'Notification' in globalThis
  );
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (!('Notification' in globalThis)) return 'unsupported';
  return Notification.permission;
}

export async function ensurePushSubscription(): Promise<boolean> {
  if (!isPushSupported()) return false;
  if (!localStorage.getItem('token')) return false;

  const reg = await navigator.serviceWorker.ready;
  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }
  if (permission !== 'granted') return false;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const { data } = await apolloClient.query({
      query: PUSH_CONFIG,
      fetchPolicy: 'network-only',
    });
    const publicKey: string = data?.pushConfig?.publicKey;
    if (!publicKey) return false;
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer,
    });
  }

  const json: any = sub.toJSON();
  const p256dh = json?.keys?.p256dh ?? arrayBufferToBase64(sub.getKey('p256dh') as ArrayBuffer);
  const auth = json?.keys?.auth ?? arrayBufferToBase64(sub.getKey('auth') as ArrayBuffer);

  await apolloClient.mutate({
    mutation: SAVE_SUB,
    variables: {
      input: {
        endpoint: sub.endpoint,
        p256dh,
        auth,
        user_agent: navigator.userAgent,
      },
    },
  });
  return true;
}

export async function unsubscribePush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  try {
    await apolloClient.mutate({ mutation: DELETE_SUB, variables: { endpoint: sub.endpoint } });
  } catch {
    /* ignore */
  }
  await sub.unsubscribe();
}

export async function initPwa() {
  await registerServiceWorker();
  // Auto-attempt subscription if permission already granted
  if (notificationPermission() === 'granted' && localStorage.getItem('token')) {
    ensurePushSubscription().catch(() => undefined);
  }
}
