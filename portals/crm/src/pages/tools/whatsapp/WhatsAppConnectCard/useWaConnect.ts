import { useCallback, useEffect, useRef } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { fireAndForget, logs } from '@duncit/logs';
import { WA_CONNECT, WA_DISCONNECT, WA_QR, WA_STATUS, type WaConnection } from '../whatsappQueries';

const LOGGER = logs.portal['crm'];

/** How often the live status + QR are re-read while a scan is pending. */
export const WA_POLL_MS = 3000;
/**
 * A session with no QR after this long is treated as stuck and restarted once. It outlasts the
 * gateway's own start deadline (a 2-minute WhatsApp Web boot window plus 30 s), so a slow but
 * healthy boot is never cut short.
 */
export const WA_STUCK_RESTART_MS = 180_000;
/** Automatic restarts per visit for a start that failed (e.g. `auth timeout`) before it is left to the user. */
export const WA_MAX_ERROR_RESTARTS = 2;

const log = (action: string, error: unknown) =>
  LOGGER.warn('WhatsAppConnectCard', action, { error, code: `wa_${action}_failed` });

/**
 * Connection state machine for the Lead Generator's "Link WhatsApp" step.
 * - Nothing starts by itself on a first connect: the person presses Connect.
 * - A session that was linked before (`connected_at` set) and dropped on its own, e.g. after a
 *   gateway restart, is resumed once when the page opens, so leaving the page never costs the
 *   link. Disconnect clears `connected_at` on the server, so a chosen disconnect stays off.
 * - While CONNECTING, polls status + QR; a session that produces no QR within
 *   WA_STUCK_RESTART_MS is restarted once, and a start that fails is retried up to
 *   WA_MAX_ERROR_RESTARTS times.
 * - Reports every change of the live status to the page (`onChanged`).
 */
export function useWaConnect(connection: WaConnection, onChanged: () => void) {
  const connecting = connection.status === 'CONNECTING';
  const linkedBefore = !!connection.connected_at;
  const [connect, connectState] = useMutation<{ waConnect: WaConnection }, { restart: boolean }>(WA_CONNECT);
  const [disconnect, disconnectState] = useMutation<{ waDisconnect: WaConnection }>(WA_DISCONNECT);

  const live = useQuery<{ waStatus: WaConnection }>(WA_STATUS, {
    fetchPolicy: 'network-only',
    pollInterval: connecting ? WA_POLL_MS : 0,
  });
  const qrQuery = useQuery<{ waQr: { qr_code: string | null; status: WaConnection['status'] } }>(WA_QR, {
    fetchPolicy: 'network-only',
    pollInterval: connecting ? WA_POLL_MS : 0,
    skip: !connecting,
  });
  const liveStatus: WaConnection['status'] | undefined = live.data?.waStatus?.status;
  const qr: string | undefined = connecting ? (qrQuery.data?.waQr?.qr_code ?? undefined) : undefined;

  // Held in a ref so a parent that re-creates `onChanged` each render neither
  // re-fires the effects below nor resets the stuck-session timer.
  const changed = useRef(onChanged);
  changed.current = onChanged;
  // Failed starts are retried only for a session somebody started: a Connect press,
  // a resumed saved session, or one that was already booting when the page opened.
  const armed = useRef(false);

  const start = useCallback(
    async (restart: boolean) => {
      armed.current = true;
      try {
        await connect({ variables: { restart } });
      } catch (error) {
        log('connect', error); // shown to the user via connectState.error
      }
      changed.current();
    },
    [connect],
  );

  const firstStatusSeen = useRef(false);
  const errorRestarts = useRef(0);
  useEffect(() => {
    if (!liveStatus) return;
    if (!firstStatusSeen.current) {
      firstStatusSeen.current = true;
      if (liveStatus === 'CONNECTING') armed.current = true;
      else if (linkedBefore && (liveStatus === 'DISCONNECTED' || liveStatus === 'ERROR')) {
        fireAndForget(start(liveStatus === 'ERROR'), LOGGER, 'WhatsAppConnectCard', 'resume');
      }
      return;
    }
    if (liveStatus === 'ERROR' && armed.current && errorRestarts.current < WA_MAX_ERROR_RESTARTS) {
      errorRestarts.current += 1;
      fireAndForget(start(true), LOGGER, 'WhatsAppConnectCard', 'errorRestart');
    }
  }, [liveStatus, linkedBefore, start]);

  // The page holds the stored connection; refresh it whenever the live status differs.
  useEffect(() => {
    if (liveStatus && liveStatus !== connection.status) changed.current();
  }, [liveStatus, connection.status]);

  // One automatic restart for a session stuck before its QR.
  const restarted = useRef(false);
  useEffect(() => {
    if (!connecting || qr || restarted.current) return undefined;
    const timer = setTimeout(() => {
      restarted.current = true;
      fireAndForget(start(true), LOGGER, 'WhatsAppConnectCard', 'stuckRestart');
    }, WA_STUCK_RESTART_MS);
    return () => clearTimeout(timer);
  }, [connecting, qr, start]);

  const stop = async () => {
    try {
      await disconnect();
    } catch (error) {
      log('disconnect', error); // shown via disconnectState.error
    }
    changed.current();
  };

  return {
    qr,
    connecting,
    /** The account was linked before, so a start resumes it (usually without a QR). */
    linkedBefore,
    /** A start request is in flight: the QR area already shows its spinner. */
    starting: connectState.loading,
    start,
    stop,
    actionError: connectState.error?.message || disconnectState.error?.message,
    busy: connectState.loading || disconnectState.loading,
  };
}
