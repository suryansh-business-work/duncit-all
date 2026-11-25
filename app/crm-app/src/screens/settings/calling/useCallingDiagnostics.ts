import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { CrmTelephony, type CallingDiagnostics, type RecordingFolder } from 'crm-telephony';

import { readQueue } from '@/services/recording-queue';
import { readSyncStatus, type SyncStatus } from '@/services/sync-status';

/** How far back "Test recording sync" looks for the phone's call recordings. */
export const RECORDING_LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000;

export interface CallingHealth {
  phone: CallingDiagnostics | null;
  folders: RecordingFolder[];
  status: SyncStatus;
  pendingRecordings: number;
}

/** Read everything the card shows; a phone without the native side reports nothing. */
export async function readCallingHealth(now = Date.now()): Promise<CallingHealth> {
  const phone = CrmTelephony;
  const [folders, status, queue] = await Promise.all([
    phone ? phone.recordingFolders(now - RECORDING_LOOKBACK_MS) : Promise.resolve([]),
    readSyncStatus(),
    readQueue(),
  ]);
  return { phone: phone?.diagnostics() ?? null, folders, status, pendingRecordings: queue.length };
}

/**
 * The card's data, re-read whenever the person comes back from Android
 * Settings (where most of these are changed) and after every test.
 */
export function useCallingDiagnostics() {
  const [health, setHealth] = useState<CallingHealth | null>(null);
  const [failed, setFailed] = useState(false);

  const refresh = useCallback(() => {
    readCallingHealth()
      .then((next) => {
        setHealth(next);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    refresh();
    const subscription = AppState.addEventListener(
      'change',
      (next) => next === 'active' && refresh(),
    );
    return () => subscription.remove();
  }, [refresh]);

  return { health, failed, refresh };
}
