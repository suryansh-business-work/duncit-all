import { notifyError, notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';

/** What to announce once a write went through — built afterwards when it depends on the answer. */
export type SuccessMessage = string | (() => string);

/**
 * Run one operator write: announce the success, announce the server's own
 * reason on failure, and answer whether it went through so the caller can
 * close its dialog or keep it open for a correction.
 */
export async function runAction(action: () => Promise<unknown>, success: SuccessMessage): Promise<boolean> {
  try {
    await action();
    notifySuccess(typeof success === 'function' ? success() : success);
    return true;
  } catch (error) {
    notifyError(parseApiError(error));
    return false;
  }
}

/** Re-read a query on the operator's request; a failure is shown, never swallowed. */
export function reload(refetch: () => Promise<unknown>): void {
  refetch().catch((error: unknown) => notifyError(parseApiError(error)));
}
