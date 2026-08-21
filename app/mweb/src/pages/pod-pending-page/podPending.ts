import { mapSearchUrl } from '@duncit/location';
import { fallbackT, type Translate } from '../../i18n/fallback';
import type { PendingMedia, PodPendingVenue } from './queries';

/** Pure derivations for the post-create venue-approval waiting page — kept out
 * of the components so every branch is unit-testable. Native twin lives in
 * app/mobile-app/src/utils/pod-pending.ts (rule 27). */

/** First image (preferred) or first media url for the pod card, else null. */
export function pendingPodImage(media: readonly PendingMedia[]): string | null {
  const item = media.find((m) => m.type === 'IMAGE') ?? media[0];
  return item?.url ?? null;
}

export type ApprovalTone = 'warning' | 'success' | 'error';

export type ApprovalIcon = 'schedule' | 'check-circle' | 'cancel';

export interface ApprovalBadge {
  label: string;
  icon: ApprovalIcon;
  tone: ApprovalTone;
}

/** Venue-card badge for the slot decision. The page stays reachable after the
 * venue decides, so every enum value maps to a badge. */
export function approvalBadge(status?: string | null, t: Translate = fallbackT): ApprovalBadge {
  if (status === 'APPROVED') {
    return { label: t('mweb.podPending.approvalApproved'), icon: 'check-circle', tone: 'success' };
  }
  if (status === 'DECLINED') {
    return { label: t('mweb.podPending.approvalDeclined'), icon: 'cancel', tone: 'error' };
  }
  return { label: t('mweb.podPending.approvalPending'), icon: 'schedule', tone: 'warning' };
}

/** The banner only ever shows a decision, never the clock the venue badge
 * uses — a pod still waiting keeps the same tick, just in amber. */
export type PendingBannerIcon = 'check-circle' | 'cancel';

export interface PendingBannerState {
  title: string;
  body: string;
  icon: PendingBannerIcon;
  tone: ApprovalTone;
}

/** The top banner follows the venue's decision too — a host who refreshes after
 * an approval must see the amber tick turn green, not the same waiting copy. */
export function pendingBannerState(
  status?: string | null,
  t: Translate = fallbackT,
): PendingBannerState {
  if (status === 'PENDING') {
    return {
      title: t('mweb.podPending.bannerTitle'),
      body: t('mweb.podPending.bannerBody'),
      icon: 'check-circle',
      tone: 'warning',
    };
  }
  if (status === 'DECLINED') {
    return {
      title: t('mweb.podPending.bannerDeclinedTitle'),
      body: t('mweb.podPending.bannerDeclinedBody'),
      icon: 'cancel',
      tone: 'error',
    };
  }
  return {
    title: t('mweb.podPending.bannerApprovedTitle'),
    body: t('mweb.podPending.bannerApprovedBody'),
    icon: 'check-circle',
    tone: 'success',
  };
}

/** Pod-card "current status" line derived from the venue decision. */
export function podPendingStatus(status?: string | null, t: Translate = fallbackT): string {
  if (status === 'PENDING') return t('mweb.podPending.statusAwaitingVenue');
  if (status === 'DECLINED') return t('mweb.podPending.statusVenueDeclined');
  return t('mweb.podPending.statusLive');
}

/** Google-Maps deep link — `lat,lng` when the venue is geocoded, else its name
 * + address. Null when neither is available. */
export function venueMapUrl(venue: Readonly<PodPendingVenue>): string | null {
  const geocoded = venue.lat != null && venue.lng != null;
  const query = geocoded
    ? `${venue.lat},${venue.lng}`
    : [venue.venue_name, venue.address].filter(Boolean).join(', ');
  if (!query) return null;
  return mapSearchUrl(query);
}

export const telUrl = (phone: string): string => `tel:${phone}`;

export const mailtoUrl = (email: string): string => `mailto:${email}`;

/** wa.me chat link — WhatsApp accepts digits only, so the "+<ext> <number>"
 * contact format is stripped down. Null when no digits remain. */
export function whatsappUrl(number: string): string | null {
  // `replaceAll` needs lib ES2021; mWeb targets ES2020, so the global regex stays.
  const digits = number.replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : null;
}
