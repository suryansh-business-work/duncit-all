/**
 * Every word the pod-media surfaces render, keyed twice.
 *
 * The keys are written out as literal `t('…')` calls rather than built from a
 * namespace + suffix: `scripts/verify-translation-keys.mjs` greps source for
 * the literal key, so a computed one is reported as shipped-but-never-rendered
 * and fails the Shared Gates job (rule 38).
 *
 * mWeb and the native app share `mweb.*`; every MUI portal shares `shell.*`.
 * Same shape, two namespaces — the server stores one row per key path, so they
 * cannot collapse into one and the values are kept word-for-word identical.
 */

export type PodMediaTranslate = (
  key: string,
  options?: { count?: number; vars?: Record<string, string | number> },
) => string;

export interface PodMediaLabels {
  /** The page, and the menu line that opens it. */
  pageTitle: string;
  back: string;
  /** What the page is for, under the title. */
  hostIntro: string;
  guestIntro: string;
  addMedia: string;
  uploading: string;
  /** Nothing on the pod yet. */
  empty: string;
  /** The strip of what is already there. */
  itemsHeading: (count: number) => string;
  byHost: string;
  byGuest: string;
  uploadedBy: (name: string) => string;
  remove: string;
  removed: string;
  added: (count: number) => string;
  /** Why this viewer cannot add anything. */
  notInvited: string;
  cancelled: string;
  /** The link the host hands out — its own wording, not the rating link's. */
  shareLink: string;
  copyLink: string;
  linkCopied: string;
  shareHeading: string;
  shareBody: string;
  /** What a host sends with the link. */
  shareMessage: (title: string) => string;
  retry: string;
  loadFailed: string;
}

/** `mweb.*` — mWeb and the native app (rule 27: one namespace for both). */
export function mwebPodMediaLabels(t: PodMediaTranslate): PodMediaLabels {
  return {
    pageTitle: t('mweb.podMedia.uploadPodMedia'),
    back: t('mweb.podMedia.back'),
    hostIntro: t('mweb.podMedia.hostIntro'),
    guestIntro: t('mweb.podMedia.guestIntro'),
    addMedia: t('mweb.podMedia.addMedia'),
    uploading: t('mweb.podMedia.uploading'),
    empty: t('mweb.podMedia.empty'),
    itemsHeading: (count) => t('mweb.podMedia.itemsHeading', { vars: { count } }),
    byHost: t('mweb.podMedia.byHost'),
    byGuest: t('mweb.podMedia.byGuest'),
    uploadedBy: (name) => t('mweb.podMedia.uploadedBy', { vars: { name } }),
    remove: t('mweb.podMedia.remove'),
    removed: t('mweb.podMedia.removed'),
    added: (count) => t('mweb.podMedia.added', { vars: { count } }),
    notInvited: t('mweb.podMedia.notInvited'),
    cancelled: t('mweb.podMedia.cancelled'),
    shareLink: t('mweb.podMedia.shareLink'),
    copyLink: t('mweb.podMedia.copyLink'),
    linkCopied: t('mweb.podMedia.linkCopied'),
    shareHeading: t('mweb.podMedia.shareHeading'),
    shareBody: t('mweb.podMedia.shareBody'),
    shareMessage: (title) => t('mweb.podMedia.shareMessage', { vars: { title } }),
    retry: t('mweb.podMedia.retry'),
    loadFailed: t('mweb.podMedia.loadFailed'),
  };
}

/** `shell.*` — every MUI portal. */
export function shellPodMediaLabels(t: PodMediaTranslate): PodMediaLabels {
  return {
    pageTitle: t('shell.podMedia.uploadPodMedia'),
    back: t('shell.podMedia.back'),
    hostIntro: t('shell.podMedia.hostIntro'),
    guestIntro: t('shell.podMedia.guestIntro'),
    addMedia: t('shell.podMedia.addMedia'),
    uploading: t('shell.podMedia.uploading'),
    empty: t('shell.podMedia.empty'),
    itemsHeading: (count) => t('shell.podMedia.itemsHeading', { vars: { count } }),
    byHost: t('shell.podMedia.byHost'),
    byGuest: t('shell.podMedia.byGuest'),
    uploadedBy: (name) => t('shell.podMedia.uploadedBy', { vars: { name } }),
    remove: t('shell.podMedia.remove'),
    removed: t('shell.podMedia.removed'),
    added: (count) => t('shell.podMedia.added', { vars: { count } }),
    notInvited: t('shell.podMedia.notInvited'),
    cancelled: t('shell.podMedia.cancelled'),
    shareLink: t('shell.podMedia.shareLink'),
    copyLink: t('shell.podMedia.copyLink'),
    linkCopied: t('shell.podMedia.linkCopied'),
    shareHeading: t('shell.podMedia.shareHeading'),
    shareBody: t('shell.podMedia.shareBody'),
    shareMessage: (title) => t('shell.podMedia.shareMessage', { vars: { title } }),
    retry: t('shell.podMedia.retry'),
    loadFailed: t('shell.podMedia.loadFailed'),
  };
}

/** Pick the namespace the calling surface ships. */
export function buildPodMediaLabels(
  t: PodMediaTranslate,
  namespace: 'mweb' | 'shell',
): PodMediaLabels {
  return namespace === 'mweb' ? mwebPodMediaLabels(t) : shellPodMediaLabels(t);
}
