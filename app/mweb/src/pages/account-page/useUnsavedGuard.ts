import { useCallback, useRef, useState } from 'react';

export interface UnsavedGuard {
  /** Current dirty state — bind to the form's `onDirtyChange`. */
  setDirty: (dirty: boolean) => void;
  /** Register the form's reset so a confirmed discard can revert it. */
  registerReset: (reset: () => void) => void;
  /** Whether the "Discard unsaved changes?" confirm is open. */
  confirmOpen: boolean;
  /** Close handler that guards: confirms first when there are unsaved changes. */
  requestClose: () => void;
  /** User confirmed the discard — reset the form and close. */
  confirmDiscard: () => void;
  /** User kept editing — dismiss the confirm only. */
  cancelDiscard: () => void;
}

/**
 * Guards an edit dialog against losing unsaved changes. When the dialog is
 * closed while the form is dirty, it opens a confirm instead of closing; the
 * caller renders that confirm (MUI Dialog) and wires the returned handlers.
 */
export function useUnsavedGuard(onClose: () => void): UnsavedGuard {
  const dirtyRef = useRef(false);
  const resetRef = useRef<() => void>(() => {});
  const [confirmOpen, setConfirmOpen] = useState(false);

  const setDirty = useCallback((dirty: boolean) => {
    dirtyRef.current = dirty;
  }, []);

  const registerReset = useCallback((reset: () => void) => {
    resetRef.current = reset;
  }, []);

  const requestClose = useCallback(() => {
    if (dirtyRef.current) {
      setConfirmOpen(true);
      return;
    }
    onClose();
  }, [onClose]);

  const confirmDiscard = useCallback(() => {
    resetRef.current();
    setConfirmOpen(false);
    onClose();
  }, [onClose]);

  const cancelDiscard = useCallback(() => setConfirmOpen(false), []);

  return {
    setDirty,
    registerReset,
    confirmOpen,
    requestClose,
    confirmDiscard,
    cancelDiscard,
  };
}
