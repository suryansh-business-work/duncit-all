import { useSyncExternalStore } from 'react';

import { storeLog } from './log';

/** Chromium's install offer; not in the DOM typings. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** What the preferences panel needs to offer "Install the app". */
export interface InstallState {
  /** The browser offered an install we can trigger. */
  canPrompt: boolean;
  /** Already running as an installed app. */
  installed: boolean;
  /** iOS Safari: no prompt exists, only Share › Add to Home Screen. */
  iosHint: boolean;
}

const isInstallPrompt = (event: Event): event is BeforeInstallPromptEvent =>
  'prompt' in event && typeof event.prompt === 'function';

function runningInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  const standalone = typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone = 'standalone' in navigator && navigator.standalone === true;
  return standalone || iosStandalone;
}

const isIos = (): boolean => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

let deferred: BeforeInstallPromptEvent | null = null;
let state: InstallState = { canPrompt: false, installed: false, iosHint: false };
const listeners = new Set<() => void>();

function publish(): void {
  const installed = runningInstalled() || state.installed;
  state = { canPrompt: !installed && deferred !== null, installed, iosHint: !installed && deferred === null && isIos() };
  for (const listener of listeners) listener();
}

/** Start listening for the browser's install offer; call once at boot. */
export function captureInstallPrompt(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (event) => {
    if (!isInstallPrompt(event)) return;
    event.preventDefault();
    deferred = event;
    publish();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    state = { ...state, installed: true };
    publish();
  });
  publish();
}

/** Show the browser's install dialog; the offer can be used only once. */
export async function promptInstall(): Promise<void> {
  const offer = deferred;
  if (!offer) return;
  deferred = null;
  try {
    await offer.prompt();
    const { outcome } = await offer.userChoice;
    storeLog.info('pwa', 'install', { outcome });
  } catch (error) {
    storeLog.error('pwa', 'install', { error });
  }
  publish();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** The live install offer, for the preferences panel. */
export const useInstallState = (): InstallState => useSyncExternalStore(subscribe, () => state, () => state);

/** Register the offline service worker — production builds only. */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((error: unknown) => {
      storeLog.error('pwa', 'register', { error });
    });
  });
}
