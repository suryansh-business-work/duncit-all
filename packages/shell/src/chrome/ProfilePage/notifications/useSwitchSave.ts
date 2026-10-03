import { useCallback, useState } from 'react';
import { createLogger } from '@duncit/logs';

const logger = createLogger('portal');

/**
 * The save state every switch on the Notifications tab shares: which row is
 * busy, whether the last write landed, whether it failed.
 *
 * A failure is kept as a flag rather than the thrown message — a raw Apollo
 * string is neither localized nor anything the reader can act on — and the
 * error itself goes to the log, where somebody can use it.
 */
export function useSwitchSave(scope: string) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  const run = useCallback(
    async (key: string, work: () => Promise<unknown>) => {
      setBusyKey(key);
      setSaveFailed(false);
      try {
        await work();
        setSaved(true);
      } catch (error) {
        setSaveFailed(true);
        logger.error('profile', scope, { error, key });
      } finally {
        setBusyKey(null);
      }
    },
    [scope],
  );

  return { busyKey, saved, saveFailed, dismissSaved: () => setSaved(false), run };
}
