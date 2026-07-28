import { mapSearchUrl } from '@duncit/location';
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
// TODO(i18n) — badge labels ship as literals until this feature is localized.
export function approvalBadge(status?: string | null): ApprovalBadge {
  if (status === 'APPROVED') return { label: 'Approved', icon: 'check-circle', tone: 'success' };
  if (status === 'DECLINED') return { label: 'Declined', icon: 'cancel', tone: 'error' };
  return { label: 'Pending Approval', icon: 'schedule', tone: 'warning' };
}

/** Pod-card "current status" line derived from the venue decision. */
// TODO(i18n) — status labels ship as literals until this feature is localized.
export function podPendingStatus(status?: string | null): string {
  if (status === 'PENDING') return 'Awaiting venue approval';
  if (status === 'DECLINED') return 'Venue declined your slot request';
  return 'Live';
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
