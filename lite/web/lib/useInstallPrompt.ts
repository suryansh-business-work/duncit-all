import { useCallback, useEffect, useState } from 'react';

/** The event Chromium browsers fire when the page can be installed as an app. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * "Get the app": the browser's own install prompt, held until the reader asks
 * for it. `canInstall` stays false where the browser offers no prompt (Safari,
 * or an app already installed), so the button simply is not shown there.
 */
export function useInstallPrompt(): { canInstall: boolean; install: () => Promise<boolean> } {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  useEffect(() => {
    const capture = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const installed = () => setDeferred(null);
    globalThis.addEventListener('beforeinstallprompt', capture);
    globalThis.addEventListener('appinstalled', installed);
    return () => {
      globalThis.removeEventListener('beforeinstallprompt', capture);
      globalThis.removeEventListener('appinstalled', installed);
    };
  }, []);
  const install = useCallback(async () => {
    if (!deferred) return false;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    return outcome === 'accepted';
  }, [deferred]);
  return { canInstall: deferred !== null, install };
}
