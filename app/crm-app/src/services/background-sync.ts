import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { logs } from '@duncit/logs';

import { syncDeviceCalls } from '@/services/call-sync';
import { isDirectoryStale, readDirectoryStatus, syncDirectory } from '@/services/directory-sync';
import { getToken, needsSecurityVerification } from '@/services/session';
import { useFeaturesStore } from '@/stores/features.store';

/**
 * The work Android runs with the app closed (WorkManager, at most every 15
 * minutes): refresh a stale caller directory, then send any new calls with
 * CRM contacts. The same run happens on app open and after every call.
 */
export const BACKGROUND_SYNC_TASK = 'duncit-crm-sync';
const MIN_INTERVAL_MINUTES = 15;

/** Directory first (so a lead made today is matched), then calls. Never throws. */
export async function runSync(): Promise<boolean> {
  const token = await getToken();
  if (!token || needsSecurityVerification(token)) return false;
  try {
    if (!useFeaturesStore.getState().hydrated) await useFeaturesStore.getState().hydrate();
    if (isDirectoryStale(await readDirectoryStatus())) await syncDirectory();
    const result = await syncDeviceCalls();
    return !result.failed;
  } catch (error) {
    logs.mobileApp.warn('crm-app/sync', 'runSync', { error, msg: 'Background sync failed; it runs again later' });
    return false;
  }
}

/** Must run at module scope (index.js) so Android can find the task with the app closed. */
export function defineBackgroundSync(): void {
  TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () =>
    (await runSync()) ? BackgroundTask.BackgroundTaskResult.Success : BackgroundTask.BackgroundTaskResult.Failed,
  );
}

export async function registerBackgroundSync(): Promise<void> {
  try {
    await BackgroundTask.registerTaskAsync(BACKGROUND_SYNC_TASK, { minimumInterval: MIN_INTERVAL_MINUTES });
  } catch (error) {
    logs.mobileApp.warn('crm-app/sync', 'register', { error, msg: 'Background sync could not be scheduled' });
  }
}

export async function unregisterBackgroundSync(): Promise<void> {
  if (await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK)) {
    await BackgroundTask.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
  }
}
