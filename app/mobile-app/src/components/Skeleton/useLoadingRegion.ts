import { useTranslation } from '@/hooks/useTranslation';

/** What a loading region says to a screen reader. */
export interface LoadingRegionProps {
  role: 'progressbar';
  'aria-label': string;
  'aria-busy': true;
}

/**
 * Spread onto the root of any loading placeholder.
 *
 * Skeleton blocks and spinners are shapes with no words, so a screen reader
 * either skips the whole state or lands on nothing it can name. The root
 * becomes ONE busy progressbar instead — "Loading…", or the screen's own words
 * when it shows some — and the blocks inside stay silent (WCAG 4.1.2 / 4.1.3).
 */
export function useLoadingRegion(label?: string): LoadingRegionProps {
  const { t } = useTranslation();
  return { role: 'progressbar', 'aria-label': label ?? t('mweb.a11y.loading'), 'aria-busy': true };
}
