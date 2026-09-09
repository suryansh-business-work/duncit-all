import { useEffect, useRef, useState } from 'react';
import { LinearProgress } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { useTranslation } from '../i18n/useTranslation';
import { mergeSx } from '../mergeSx';

/**
 * Long enough that a cached or local answer never flashes a bar, short enough
 * that a real round trip is reported before anyone reaches for a second click.
 */
const APPEAR_MS = 180;
/**
 * Once it IS on screen it stays for this long. A bar that appears and vanishes
 * within a frame reads as a glitch rather than as progress, and a page firing
 * several queries would otherwise strobe.
 */
const MIN_VISIBLE_MS = 400;

export interface TopProgressBarProps {
  /** True while anything is in flight. The timing below is applied to it. */
  busy: boolean;
  /** Screen-reader name. Defaults to the shared `Loading…`. */
  label?: string;
  sx?: SxProps<Theme>;
}

/**
 * The console's one always-on answer to "did that do anything?".
 *
 * A three-pixel indeterminate bar across the top of the viewport, shown
 * whenever a request is out. Every screen has actions whose only visible
 * result arrives with the response — a save, an approve, a filter — and until
 * this existed the seconds in between looked exactly like a dead button.
 *
 * It sits above dialogs on purpose: most actions are pressed inside one, and a
 * bar hidden behind the modal it belongs to would report nothing.
 */
export function TopProgressBar({ busy, label, sx }: Readonly<TopProgressBarProps>) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const shownAt = useRef(0);

  useEffect(() => {
    if (busy) {
      const appear = setTimeout(() => {
        shownAt.current = Date.now();
        setVisible(true);
      }, APPEAR_MS);
      return () => clearTimeout(appear);
    }
    if (!visible) return undefined;
    const remaining = MIN_VISIBLE_MS - (Date.now() - shownAt.current);
    const hide = setTimeout(() => setVisible(false), Math.max(remaining, 0));
    return () => clearTimeout(hide);
  }, [busy, visible]);

  if (!visible) return null;

  return (
    <LinearProgress
      aria-label={label ?? t('ui.loader.loading')}
      sx={mergeSx(
        {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          zIndex: (theme) => theme.zIndex.tooltip + 1,
        },
        sx,
      )}
    />
  );
}
