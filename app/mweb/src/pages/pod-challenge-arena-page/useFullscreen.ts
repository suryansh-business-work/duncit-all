import { useCallback, useEffect, useState, type RefObject } from 'react';
import { logs } from '@duncit/logs';

/** Browser full screen for one element (the arena), with Esc/exit kept in sync. */
export function useFullscreen(ref: RefObject<HTMLElement | null>) {
  const [active, setActive] = useState(false);
  const supported = typeof document !== 'undefined' && typeof document.documentElement.requestFullscreen === 'function';

  useEffect(() => {
    const sync = () => setActive(document.fullscreenElement === ref.current && !!ref.current);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, [ref]);

  const toggle = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await ref.current?.requestFullscreen();
    } catch (error) {
      // Some browsers refuse full screen outside a user gesture; the arena still works in-page.
      logs.mWeb.warn('pod-challenge-arena', 'fullscreen', { error });
    }
  }, [ref]);

  return { active, supported, toggle };
}
