import { useCallback, useEffect, useState } from 'react';
import { addToSelection } from '@duncit/utils';

/**
 * The tray behind a multi-pick dialog.
 *
 * Single-pick has no tray — the dialog closes on the first pick and always did.
 * Above one, the picks have to survive a tab switch, because the whole point is
 * choosing two from Pexels and one from the device in the same visit.
 *
 * The cap and the de-duplication live in @duncit/utils so the native app enforces
 * the same rule with different components (rule 40).
 */
export function useMediaSelection(max: number, open: boolean) {
  const [urls, setUrls] = useState<string[]>([]);

  // A fresh open starts empty — a tray carried over from last time would add
  // images the user cannot see on the field they are looking at.
  useEffect(() => {
    if (open) setUrls([]);
  }, [open]);

  const add = useCallback(
    (url: string) => setUrls((current) => addToSelection(current, url, max)),
    [max],
  );
  const remove = useCallback(
    (url: string) => setUrls((current) => current.filter((item) => item !== url)),
    [],
  );

  return { urls, add, remove, atLimit: urls.length >= max };
}
