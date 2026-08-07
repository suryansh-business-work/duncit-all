import { useEffect } from 'react';

/**
 * Ctrl/Cmd+K opens search, Escape closes it.
 *
 * On the window rather than the panel: the whole point of the shortcut is not
 * having to click into the chat first, and a listener scoped to the panel would
 * only work once you already had. preventDefault because the browser's own
 * Ctrl+K is the address bar's search, and losing the keystroke to that is worse
 * than not having the shortcut.
 */
export function useSearchShortcut(onOpen: () => void, onClose: () => void) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onOpen();
        return;
      }
      if (event.key === 'Escape') onClose();
    };
    globalThis.addEventListener('keydown', onKey);
    return () => globalThis.removeEventListener('keydown', onKey);
  }, [onOpen, onClose]);
}
