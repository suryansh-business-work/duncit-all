import { useCallback, useState } from 'react';
import { parseApiError } from '@duncit/utils';

/**
 * Runs one server change at a time for a page: tracks that it is saving and
 * keeps its error (in words a person can read) for the page to show, instead
 * of throwing. `run` resolves to whether the change went through.
 */
export function useActionRunner() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (work: () => Promise<unknown>): Promise<boolean> => {
    setError(null);
    setSaving(true);
    try {
      await work();
      return true;
    } catch (e) {
      setError(parseApiError(e));
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { saving, error, clearError, run };
}
