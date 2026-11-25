import { notify } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';

/**
 * How every Inbox action says how it went, for comments and conversations
 * alike: the server's copy goes to `onChanged` and the person is told it
 * worked (in words that may depend on the answer); a refusal is shown as the server worded it. Resolves true only when
 * it worked, so a dialog or the reply box knows to close or clear.
 */
export async function runInboxAction<T>(
  work: () => Promise<T | null | undefined>,
  done: string | ((value: T) => string),
  onChanged: (value: T) => void
): Promise<boolean> {
  try {
    const value = await work();
    if (!value) return false;
    notify(typeof done === 'string' ? done : done(value), 'success');
    onChanged(value);
    return true;
  } catch (err) {
    notify(parseApiError(err), 'error');
    return false;
  }
}

/** An AI draft for the reply box, or null when there is none (and why, when the server refused). */
export async function askForDraft(work: () => Promise<string | null | undefined>, ready: string): Promise<string | null> {
  try {
    const draft = (await work()) ?? null;
    if (draft) notify(ready, 'success');
    return draft;
  } catch (err) {
    notify(parseApiError(err), 'error');
    return null;
  }
}
