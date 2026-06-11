import { useEffect } from 'react';

const ACTION_SELECTOR = [
  'button',
  'a[href]',
  '[role="button"]',
  '.MuiChip-clickable',
  '.MuiBottomNavigationAction-root',
].join(',');

export function useHapticFeedback(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !('vibrate' in navigator)) return undefined;
    let lastVibrateAt = 0;
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const action = target?.closest(ACTION_SELECTOR) as HTMLElement | null;
      if (!action || action.getAttribute('aria-disabled') === 'true') return;
      if ('disabled' in action && (action as HTMLButtonElement).disabled) return;
      const now = Date.now();
      if (now - lastVibrateAt < 90) return;
      lastVibrateAt = now;
      navigator.vibrate(8);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [enabled]);
}