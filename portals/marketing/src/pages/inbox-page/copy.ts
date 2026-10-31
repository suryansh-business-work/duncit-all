import type { SocialInboxStatus, SocialInboxView } from './queries';

/**
 * The Inbox's enums mapped to their Localization keys, written out in full so
 * the translation gate can see each one is used.
 */
export const INBOX_STATUSES: readonly SocialInboxStatus[] = ['OPEN', 'REPLIED', 'DONE', 'SPAM'];

export const INBOX_STATUS_LABEL: Record<SocialInboxStatus, string> = {
  OPEN: 'marketing.inbox.statusOpen',
  REPLIED: 'marketing.inbox.statusReplied',
  DONE: 'marketing.inbox.statusDone',
  SPAM: 'marketing.inbox.statusSpam',
};

export const INBOX_STATUS_COLORS = { OPEN: 'info', REPLIED: 'success', DONE: 'default', SPAM: 'warning' } as const;

/** The views a summary card opens, in card order, with the summary field it counts. */
export const INBOX_CARDS = [
  { view: 'OPEN', field: 'open', label: 'marketing.inbox.cardOpen' },
  { view: 'FLAGGED', field: 'flagged', label: 'marketing.inbox.cardFlagged' },
  { view: 'UNASSIGNED', field: 'unassigned', label: 'marketing.inbox.cardUnassigned' },
  { view: 'MINE', field: 'mine', label: 'marketing.inbox.cardMine' },
] as const;

const VIEWS: readonly SocialInboxView[] = ['OPEN', 'FLAGGED', 'UNASSIGNED', 'MINE', 'ALL'];
const isView = (value: string | null): value is SocialInboxView => VIEWS.some((view) => view === value);

/** The view the URL names (`?view=FLAGGED`); open comments when it names nothing. */
export const inboxViewOf = (params: URLSearchParams): SocialInboxView => {
  const view = params.get('view');
  return isView(view) ? view : 'OPEN';
};

/** The longest reply a network takes; what to show while the capabilities are loading. */
export const FALLBACK_REPLY_MAX = 280;
