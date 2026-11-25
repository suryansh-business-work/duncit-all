import { useCallback, useEffect, useRef, useState } from 'react';
import {
  WA_POLL_MS,
  WA_STUCK_RESTART_MS,
  waFirstStatusAction,
  waShouldRetryError,
} from '@duncit/utils';
import { fireAndForget, logs } from '@duncit/logs';

import {
  CrmAppWhatsappConnectDocument,
  CrmAppWhatsappDisconnectDocument,
  CrmAppWhatsappQrDocument,
  CrmAppWhatsappStatusDocument,
} from '@/graphql/whatsappGenerator';
import { gqlRequest } from '@/services/graphql.client';
import { errorMessage } from '@/utils/errors';

const SCOPE = 'crm-app/WhatsAppConnect';

export interface WaConnectionLike {
  status: string;
  connected_at?: string | null;
}

/**
 * Live status and QR: read once when the step opens, then every WA_POLL_MS
 * while the session is CONNECTING (the QR only then).
 */
function useLiveSession(connecting: boolean) {
  const [liveStatus, setLiveStatus] = useState<string>();
  const [qr, setQr] = useState<string>();
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const read = async () => {
      try {
        const [status, code] = await Promise.all([
          gqlRequest(CrmAppWhatsappStatusDocument, {}),
          connecting ? gqlRequest(CrmAppWhatsappQrDocument, {}) : null,
        ]);
        if (stopped) return;
        setLiveStatus(status.waStatus.status);
        setQr(code?.waQr.qr_code ?? undefined);
      } catch (error) {
        logs.mobileApp.warn(SCOPE, 'readStatus', { error });
      }
      if (!stopped && connecting)
        timer = setTimeout(() => fireAndForget(read(), logs.mobileApp, SCOPE, 'poll'), WA_POLL_MS);
    };
    fireAndForget(read(), logs.mobileApp, SCOPE, 'read');
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [connecting]);
  return { liveStatus, qr: connecting ? qr : undefined };
}

/**
 * The "Link WhatsApp" step's state machine — the portal's useWaConnect:
 * - nothing starts by itself on a first connect: the person presses Connect;
 * - a session linked before that dropped on its own is resumed once when the
 *   screen opens (Disconnect clears `connected_at`, so a chosen disconnect stays off);
 * - a session with no QR after WA_STUCK_RESTART_MS is restarted once, and a start
 *   that fails is retried a couple of times;
 * - every change of the live status is reported to the screen (`onChanged`).
 */
export function useWaConnect(
  connection: WaConnectionLike,
  onChanged: () => void,
  fallbackError: string,
) {
  const connecting = connection.status === 'CONNECTING';
  const linkedBefore = !!connection.connected_at;
  const { liveStatus, qr } = useLiveSession(connecting);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // A ref, so a parent re-creating `onChanged` neither re-fires the effects nor resets the timer.
  const changed = useRef(onChanged);
  useEffect(() => {
    changed.current = onChanged;
  }, [onChanged]);
  const armed = useRef(false);

  const start = useCallback(
    async (restart: boolean) => {
      armed.current = true;
      setStarting(true);
      setActionError(null);
      try {
        await gqlRequest(CrmAppWhatsappConnectDocument, { restart });
      } catch (error) {
        logs.mobileApp.warn(SCOPE, 'connect', { error });
        setActionError(errorMessage(error, fallbackError));
      } finally {
        setStarting(false);
      }
      changed.current();
    },
    [fallbackError],
  );

  const firstStatusSeen = useRef(false);
  const errorRestarts = useRef(0);
  useEffect(() => {
    if (!liveStatus) return;
    if (!firstStatusSeen.current) {
      firstStatusSeen.current = true;
      const action = waFirstStatusAction(liveStatus, linkedBefore);
      if (action === 'arm') armed.current = true;
      else if (action !== 'none')
        fireAndForget(start(action === 'restart'), logs.mobileApp, SCOPE, 'resume');
      return;
    }
    if (waShouldRetryError(liveStatus, armed.current, errorRestarts.current)) {
      errorRestarts.current += 1;
      fireAndForget(start(true), logs.mobileApp, SCOPE, 'errorRestart');
    }
  }, [liveStatus, linkedBefore, start]);

  // The screen holds the stored connection; refresh it whenever the live status differs.
  useEffect(() => {
    if (liveStatus && liveStatus !== connection.status) changed.current();
  }, [liveStatus, connection.status]);

  // One automatic restart for a session stuck before its QR.
  const restarted = useRef(false);
  useEffect(() => {
    if (!connecting || qr || restarted.current) return undefined;
    const timer = setTimeout(() => {
      restarted.current = true;
      fireAndForget(start(true), logs.mobileApp, SCOPE, 'stuckRestart');
    }, WA_STUCK_RESTART_MS);
    return () => clearTimeout(timer);
  }, [connecting, qr, start]);

  const stop = async () => {
    setStopping(true);
    setActionError(null);
    try {
      await gqlRequest(CrmAppWhatsappDisconnectDocument, {});
    } catch (error) {
      logs.mobileApp.warn(SCOPE, 'disconnect', { error });
      setActionError(errorMessage(error, fallbackError));
    } finally {
      setStopping(false);
    }
    changed.current();
  };

  return {
    qr,
    connecting,
    /** Linked before, so a start resumes it (usually without a QR). */
    linkedBefore,
    /** A start request is in flight: the QR area already shows its spinner. */
    starting,
    start,
    stop,
    actionError,
    busy: starting || stopping,
  };
}

export type WaConnect = ReturnType<typeof useWaConnect>;
