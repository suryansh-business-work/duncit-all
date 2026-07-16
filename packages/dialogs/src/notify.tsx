import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Snackbar } from '@mui/material';

export type NotifySeverity = 'info' | 'success' | 'warning' | 'error';
const EVENT = 'duncit:notify';

interface Payload {
  message: string;
  severity: NotifySeverity;
  duration?: number;
}

/** Imperative notification — replaces window.alert() across the portals. */
export function notify(message: string, severity: NotifySeverity = 'info', duration = 4000) {
  /* v8 ignore next -- SSR guard, unreachable in jsdom */
  if (typeof globalThis.window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<Payload>(EVENT, { detail: { message, severity, duration } })
  );
}

export const notifyError = (msg: string) => notify(msg, 'error');
export const notifySuccess = (msg: string) => notify(msg, 'success');

export interface NotifyApi {
  notify: typeof notify;
  notifyError: typeof notifyError;
  notifySuccess: typeof notifySuccess;
}

const NOTIFY_API: NotifyApi = Object.freeze({ notify, notifyError, notifySuccess });

/**
 * Hook flavour of the imperative API (stable identity across renders).
 * Requires a <NotifyHost /> (or <NotifyProvider>) mounted near the app root.
 */
export function useNotify(): NotifyApi {
  return NOTIFY_API;
}

/** Mount once near the app root to render queued notifications. */
export function NotifyHost() {
  const [item, setItem] = useState<Payload | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<Payload>).detail;
      if (!detail?.message) return;
      setItem(detail);
    };
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, []);

  return (
    <Snackbar
      open={!!item}
      autoHideDuration={item?.duration ?? 4000}
      onClose={(_, reason) => {
        /* v8 ignore next -- MUI clickaway path, not reproducible in jsdom */
        if (reason === 'clickaway') return;
        setItem(null);
      }}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        severity={item?.severity ?? 'info'}
        onClose={() => setItem(null)}
        variant="filled"
        sx={{ width: '100%' }}
      >
        {item?.message}
      </Alert>
    </Snackbar>
  );
}

interface NotifyProviderProps {
  children: ReactNode;
}

/** Provider-style mounting: renders children plus a NotifyHost. */
export function NotifyProvider({ children }: Readonly<NotifyProviderProps>) {
  return (
    <>
      {children}
      <NotifyHost />
    </>
  );
}
