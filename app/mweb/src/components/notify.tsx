import { useEffect, useState } from 'react';
import { Alert, Snackbar } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';

type Severity = 'info' | 'success' | 'warning' | 'error';
const EVENT = 'duncit:notify';

/** One thing the reader can do about the notification, e.g. "Go to cart". */
export interface NotifyAction {
  label: string;
  onClick: () => void;
}

interface Payload {
  message: string;
  severity: Severity;
  duration?: number;
  action?: NotifyAction;
}

/** Imperative notification — replaces window.alert() across the mWeb app. A
 * new one replaces the one on screen, so repeated calls never stack. */
export function notify(
  message: string,
  severity: Severity = 'info',
  duration = 4000,
  action?: NotifyAction,
) {
  if (globalThis.window === undefined) return;
  globalThis.dispatchEvent(
    new CustomEvent<Payload>(EVENT, { detail: { message, severity, duration, action } })
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
    globalThis.addEventListener(EVENT, handler);
    return () => globalThis.removeEventListener(EVENT, handler);
  }, []);
  const action = item?.action;
  return (
    <Snackbar
      data-testid="notify-host"
      open={!!item}
      autoHideDuration={item?.duration ?? 4000}
      onClose={(_, reason) => {
        if (reason === 'clickaway') return;
        setItem(null);
      }}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{ bottom: 'var(--duncit-bottom-nav-overlay-offset, 88px) !important' }}
    >
      <Alert
        data-testid="notify-host-alert"
        severity={item?.severity ?? 'info'}
        onClose={() => setItem(null)}
        variant="filled"
        sx={{ width: '100%' }}
        // MUI draws `action` in place of the close icon; the snackbar still
        // hides itself, and pressing the action closes it.
        action={
          action && (
            <DuncitButton
              data-testid="notify-host-action"
              color="inherit"
              size="small"
              onClick={() => {
                setItem(null);
                action.onClick();
              }}
            >
              {action.label}
            </DuncitButton>
          )
        }
      >
        {item?.message}
      </Alert>
    </Snackbar>
  );
}
