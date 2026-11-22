import { useCallback, useEffect, useRef } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { fireAndForget, logs } from '@duncit/logs';
import { WA_CONNECT, WA_DISCONNECT, WA_GENERATE_API_KEY, WA_QR, WA_SAVE_CONFIG, WA_STATUS, type WaConnection } from '../whatsappQueries';

/** Manual gateway override sent by Advanced settings (`WaConfigInput`). */
export interface WaConfigInput {
  base_url: string;
  api_key?: string;
}

const LOGGER = logs.portal['crm'];

/** How often the live status + QR are re-read while a scan is pending. */
export const WA_POLL_MS = 3000;
/** A session with no QR after this long is treated as stuck and restarted once. */
export const WA_STUCK_RESTART_MS = 60_000;

const log = (action: string, error: unknown) =>
  LOGGER.warn('WhatsAppConnectCard', action, { error, code: `wa_${action}_failed` });

/**
 * Connection state machine for the Lead Generator.
 * - Reads the LIVE gateway status on mount (the stored one can be days old) and,
 *   when the session is not running, starts it — no button press needed.
 * - While CONNECTING, polls status + QR; a session that produces no QR within
 *   WA_STUCK_RESTART_MS is restarted once.
 * - Reports every change of the live status to the page (`onChanged`).
 */
export function useWaConnect(connection: WaConnection, onChanged: () => void) {
  const connecting = connection.status === 'CONNECTING';
  const [connect, connectState] = useMutation<{ waConnect: WaConnection }, { restart: boolean }>(WA_CONNECT);
  const [disconnect, disconnectState] = useMutation<{ waDisconnect: WaConnection }>(WA_DISCONNECT);
  const [generate, generateState] = useMutation<{ waGenerateApiKey: { connection: WaConnection } }>(WA_GENERATE_API_KEY);
  const [saveConfig, saveState] = useMutation<{ waSaveConfig: WaConnection }, { input: WaConfigInput }>(WA_SAVE_CONFIG);

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

  const start = useCallback(
    async (restart: boolean) => {
      try {
        await connect({ variables: { restart } });
      } catch (error) {
        log('connect', error); // shown to the user via connectState.error
      }
      changed.current();
    },
    [connect],
  );

  // Auto-start once per visit, from the first live status.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!liveStatus || autoStarted.current) return;
    autoStarted.current = true;
    if (liveStatus === 'DISCONNECTED' || liveStatus === 'ERROR') {
      fireAndForget(start(liveStatus === 'ERROR'), LOGGER, 'WhatsAppConnectCard', 'autoStart');
    }
  }, [liveStatus, start]);

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

  const generateKey = async () => {
    try {
      await generate();
    } catch (error) {
      log('generateApiKey', error); // shown via generateState.error
    }
    changed.current();
  };

  const saveAndConnect = async (input: WaConfigInput) => {
    try {
      await saveConfig({ variables: { input } });
      await connect({ variables: { restart: false } });
    } catch (error) {
      log('saveAndConnect', error); // shown via saveState/connectState.error
    }
    changed.current();
  };

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
    start,
    stop,
    generateKey,
    saveAndConnect,
    generated: !!generateState.data && !generateState.error,
    generateError: generateState.error?.message,
    actionError: connectState.error?.message || saveState.error?.message || disconnectState.error?.message,
    busy: saveState.loading || connectState.loading || disconnectState.loading || generateState.loading,
  };
}
