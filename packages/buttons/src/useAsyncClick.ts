import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';

/** What a click handler really returns — `void` in MUI's types, a promise in practice. */
type ClickHandler = (event: MouseEvent<never>) => unknown;

const isThenable = (value: unknown): value is PromiseLike<unknown> =>
  typeof (value as PromiseLike<unknown> | null | undefined)?.then === 'function';

export interface AsyncClickState {
  /** Wrapped handler — pass it through in place of the caller's `onClick`. */
  onClick?: ClickHandler;
  /** `true` while the handler's promise is in flight; never `false` (see below). */
  loading?: boolean | null;
}

/**
 * A press that waits, showing that it is waiting.
 *
 * Every action in the consoles is a GraphQL round trip, and the button for it
 * looked identical before and during — so the honest signal that a click landed
 * was the row changing a second later, and the natural response to no signal is
 * to click again. Rather than thread a `loading` prop through ~800 call sites
 * (and miss some), the button reads the answer off the handler it was already
 * given: an `onClick` that returns a promise is an action still running, and
 * the button spins until it settles.
 *
 * A handler that returns nothing behaves exactly as before, so this is additive
 * for every call site that does its work synchronously.
 *
 * Failure is deliberately not this hook's business — it ends the spinner on
 * both outcomes and leaves the promise's own result to the caller, which is
 * where the notify/form-error handling already lives. Owning it here would put
 * error policy in a button.
 */
export function useAsyncClick(
  onClick: ClickHandler | undefined,
  loading: boolean | null | undefined,
): AsyncClickState {
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);

  // Assigned on mount, not just cleared on unmount: StrictMode mounts, cleans
  // up and mounts again, and a ref only cleared would stay `false` for the life
  // of the real mount — leaving every button stuck spinning in development.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // No handler, no wrapper: the button keeps `onClick` undefined exactly as it
  // was given, so a wrapper that exists only when a handler does never has to
  // guard against the handler being absent.
  const run = useMemo(
    () =>
      onClick &&
      ((event: MouseEvent<never>) => {
        const result = onClick(event);
        if (!isThenable(result)) return;
        setBusy(true);
        const settle = () => {
          if (mounted.current) setBusy(false);
        };
        result.then(settle, settle);
      }),
    [onClick],
  );

  return {
    onClick: run,
    // `undefined`, never `false`: MUI renders a permanent loading wrapper span
    // as soon as the prop is a boolean, so a resting button keeps exactly the
    // markup it has today.
    loading: loading ?? (busy || undefined),
  };
}
