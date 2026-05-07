import { useEffect, useState } from 'react';
import { Alert, Snackbar } from '@mui/material';

type Severity = 'info' | 'success' | 'warning' | 'error';
const EVENT = 'duncit:notify';

interface Payload {
  message: string;
  severity: Severity;
  duration?: number;
}

/** Imperative notification — replaces window.alert() across the mWeb app. */
export function notify(message: string, severity: Severity = 'info', duration = 4000) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<Payload>(EVENT, { detail: { message, severity, duration } })
  );
}

export const notifyError = (msg: string) => notify(msg, 'error');
export const notifySuccess = (msg: string) => notify(msg, 'success');

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
        if (reason === 'clickaway') return;
        setItem(null);
      }}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{ bottom: 'calc(64px + env(safe-area-inset-bottom)) !important' }}
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
