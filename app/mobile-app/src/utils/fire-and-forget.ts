/**
 * Run a promise we deliberately do not await, surfacing a rejection instead of
 * dropping it.
 *
 * Replaces the `void promise()` idiom: `void` silently discards a rejection, so
 * a failed background refresh/upload disappears with no trace. Keeping the
 * handler here means every call site gets the same reporting for free.
 */
export function fireAndForget(promise: Promise<unknown>): void {
  promise.catch((error: unknown) => {
    console.error(error);
  });
}
