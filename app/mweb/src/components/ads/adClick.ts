import type { KeyboardEvent } from 'react';
import type { PublicAd } from './useActiveAds';

/** Open an ad's landing page in a new tab (PolicyPdfButton precedent). */
export function openAdLink(url?: string | null): void {
  if (url) window.open(url, '_blank', 'noreferrer');
}

/** Button-like a11y props for a clickable ad surface (Sonar S1082): role,
 * keyboard activation and an aria-label. Ads without a redirect_url get no
 * handlers at all — they are plain static content. */
export function adClickProps(ad: Pick<PublicAd, 'redirect_url' | 'ad_title'>) {
  if (!ad.redirect_url) return {};
  const open = () => openAdLink(ad.redirect_url);
  return {
    onClick: open,
    role: 'button' as const,
    tabIndex: 0,
    'aria-label': ad.ad_title ? `Sponsored: ${ad.ad_title}` : 'Sponsored ad',
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') open();
    },
  };
}
