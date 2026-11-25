import type { PendingPostCall } from 'crm-telephony';

import { callKey } from '@/features/calls/callPlan';
import { syncDeviceCalls } from '@/services/call-sync';
import { readSyncStatus, wasLogged } from '@/services/sync-status';
import { useFeaturesStore } from '@/stores/features.store';

/**
 * What the post-call screen says about saving the call — only "saved" when
 * THIS call reached the CRM, whether this sync or an earlier background one
 * sent it. Before, it said "saved" whenever the sync merely did not fail, even
 * when the call had been skipped.
 */
export type SaveState = 'saving' | 'saved' | 'notLogged' | 'retrying' | 'off';

export async function syncPostCall(pending: PendingPostCall | null): Promise<SaveState> {
  if (!useFeaturesStore.getState().autoLog) return 'off';
  const result = await syncDeviceCalls();
  const key = pending ? callKey(pending.number) : '';
  if (key && wasLogged(await readSyncStatus(), key, pending?.startedAt ?? 0)) return 'saved';
  if (!pending && result.logged > 0) return 'saved';
  return result.failed ? 'retrying' : 'notLogged';
}
