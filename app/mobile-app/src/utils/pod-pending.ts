/** Pure derivations for the post-create venue-approval waiting screen — kept
 * out of the components so every branch is unit-testable. mWeb twin (rule 27). */

import { fallbackT, type Translate } from '@/i18n/fallback';

export interface PendingMedia {
  url: string;
  type: string;
}

/** First image (preferred) or first media url for the pod card, else null. */
export function pendingPodImage(media: readonly PendingMedia[]): string | null {
  const item = media.find((m) => m.type === 'IMAGE') ?? media[0];
  return item?.url ?? null;
}

export type ApprovalTone = 'warning' | 'success' | 'error';

export interface ApprovalBadge {
  label: string;
  icon: 'schedule' | 'check-circle' | 'cancel';
  tone: ApprovalTone;
}

/** Venue-card badge for the slot decision. The screen stays reachable after
 * the venue decides, so every enum value maps to a badge. */
export function approvalBadge(status?: string | null, t: Translate = fallbackT): ApprovalBadge {
  if (status === 'APPROVED') {
    return { label: t('mweb.podPending.approvalApproved'), icon: 'check-circle', tone: 'success' };
  }
  if (status === 'DECLINED') {
    return { label: t('mweb.podPending.approvalDeclined'), icon: 'cancel', tone: 'error' };
  }
  return { label: t('mweb.podPending.approvalPending'), icon: 'schedule', tone: 'warning' };
}

/** Pod-card "current status" line derived from the venue decision. */
export function podPendingStatus(status?: string | null, t: Translate = fallbackT): string {
  if (status === 'PENDING') return t('mweb.podPending.statusAwaitingVenue');
  if (status === 'DECLINED') return t('mweb.podPending.statusVenueDeclined');
  return t('mweb.podPending.statusLive');
}

/** Google-Maps deep link — `lat,lng` when the venue is geocoded, else its name
 * + address. Same URL grammar as @duncit/location's mapSearchUrl (web twin —
 * that package is MUI/web-only, so the native app mirrors the format here). */
export function venueMapUrl(
  venue: Readonly<{
    venue_name: string;
    address?: string | null;
    lat?: number | null;
    lng?: number | null;
  }>,
): string | null {
  const query =
    venue.lat != null && venue.lng != null
      ? `${venue.lat},${venue.lng}`
      : [venue.venue_name, venue.address].filter(Boolean).join(', ');
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export const telUrl = (phone: string): string => `tel:${phone}`;

export const mailtoUrl = (email: string): string => `mailto:${email}`;

/** wa.me chat link — WhatsApp accepts digits only, so the "+<ext> <number>"
 * contact format is stripped down. Null when no digits remain. */
export function whatsappUrl(number: string): string | null {
  const digits = number.replaceAll(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : null;
}
