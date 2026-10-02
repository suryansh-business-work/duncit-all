import type { HomeStatusViewerItem, HomeStatusViewerSlide } from './types';

/** "X remaining" until the status auto-expires; null when unknown/expired.
 * Compact units (45m / 12h / 1d) — identical to the mobile app's label. */
export function statusRemainingLabel(expiresAt?: string | null, now: Date = new Date()): string | null {
  if (!expiresAt) return null;
  const expiry = new Date(expiresAt);
  if (Number.isNaN(expiry.getTime()) || expiry.getTime() <= now.getTime()) return null;
  const minutes = Math.ceil((expiry.getTime() - now.getTime()) / 60000);
  if (minutes < 60) return `${minutes}m remaining`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h remaining`;
  return `${Math.floor(hours / 24)}d remaining`;
}

/** Where the action under the shown slide goes. The pinned Duncit group carries
 * its link per SLIDE; every other story has one target for the whole item. */
export function slideTarget(item: HomeStatusViewerItem, slide?: HomeStatusViewerSlide) {
  if (slide?.linkUrl) return { url: slide.linkUrl, internal: slide.linkInternal === true };
  return { url: item.targetUrl, internal: item.internal === true };
}

/** Test ids and copy the pinned Duncit group names differently from a story. */
export function viewerChrome(kind: HomeStatusViewerItem['kind']) {
  if (kind === 'official') {
    return {
      slideTestId: 'status-official-slide',
      captionTestId: 'status-official-caption',
      linkTestId: 'status-official-link',
      linkKey: 'mweb.status.officialOpenLink',
    };
  }
  return {
    slideTestId: undefined,
    captionTestId: undefined,
    linkTestId: 'status-open-target',
    linkKey: 'mweb.status.openDetails',
  };
}

// A horizontal pointer drag longer than this (px) counts as a story swipe.
export const SWIPE_THRESHOLD = 48;

// Each slide runs 15s before auto-advancing; a video that ends sooner advances
// immediately, and the 15s ceiling keeps a long clip from holding it open
// (Bugs 3 & 8).
export const STATUS_DURATION_MS = 15000;
export const MAX_VIDEO_SECONDS = 15;
