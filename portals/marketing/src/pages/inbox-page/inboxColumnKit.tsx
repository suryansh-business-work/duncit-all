import type { DuncitColumn } from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import type { Translate } from '@duncit/shell';
import { PlatformCell } from '../social-accounts-page/SocialCells';
import { EnumChip } from '../social-accounts-page/monitoring/CommentCells';
import { PLATFORMS, PLATFORM_LABEL, SENTIMENT_COLORS, SENTIMENT_LABEL, enumOptions } from '../social-accounts-page/copy';
import type { SocialPlatform, SocialSentiment } from '../social-accounts-page/queries';
import { INBOX_STATUSES, INBOX_STATUS_COLORS, INBOX_STATUS_LABEL } from './copy';
import type { InboxAccount, SocialInboxStatus } from './queries';

/**
 * The columns every Inbox queue shares — comments, DMs and the All tab — so
 * the three read the same and are written once. `filterable: false` is for
 * the All tab, whose mix of rows has no common filters.
 */
interface KitOptions {
  filterable?: boolean;
}

const SENTIMENTS: readonly SocialSentiment[] = ['NEGATIVE', 'NEUTRAL', 'POSITIVE'];

export function networkColumn<T extends { platform: SocialPlatform }>(
  t: Translate,
  platforms: readonly SocialPlatform[] = PLATFORMS,
  { filterable = true }: KitOptions = {}
): DuncitColumn<T> {
  return {
    field: 'platform',
    headerName: t('marketing.inbox.colNetwork'),
    type: filterable ? 'enum' : 'text',
    width: 150,
    sortable: false,
    filterable,
    options: enumOptions(platforms, PLATFORM_LABEL, t),
    cellRenderer: (row) => <PlatformCell platform={row.platform} label={t(PLATFORM_LABEL[row.platform])} />,
    valueGetter: (row) => t(PLATFORM_LABEL[row.platform]),
  };
}

export function accountColumn<T extends { account_name: string }>(accounts: readonly InboxAccount[], t: Translate): DuncitColumn<T> {
  return {
    field: 'account_id',
    headerName: t('marketing.inbox.colAccount'),
    type: 'enum',
    minWidth: 160,
    sortable: false,
    options: accounts.map((account) => ({ value: account.id, label: account.name })),
    valueGetter: (row) => row.account_name,
  };
}

export function sentimentColumn<T extends { ai_sentiment: SocialSentiment | null }>(t: Translate, { filterable = true }: KitOptions = {}): DuncitColumn<T> {
  return {
    field: 'ai_sentiment',
    headerName: t('marketing.inbox.colSentiment'),
    type: filterable ? 'enum' : 'text',
    width: 140,
    sortable: false,
    filterable,
    options: enumOptions(SENTIMENTS, SENTIMENT_LABEL, t),
    cellRenderer: (row) => <EnumChip value={row.ai_sentiment} colors={SENTIMENT_COLORS} labels={SENTIMENT_LABEL} t={t} />,
  };
}

export function statusColumn<T extends { status: SocialInboxStatus }>(t: Translate, { filterable = true }: KitOptions = {}): DuncitColumn<T> {
  return {
    field: 'status',
    headerName: t('marketing.inbox.colStatus'),
    type: filterable ? 'enum' : 'text',
    width: 130,
    sortable: false,
    filterable,
    options: enumOptions(INBOX_STATUSES, INBOX_STATUS_LABEL, t),
    cellRenderer: (row) => <StatusChip status={row.status} colorMap={INBOX_STATUS_COLORS} label={t(INBOX_STATUS_LABEL[row.status])} />,
    valueGetter: (row) => t(INBOX_STATUS_LABEL[row.status]),
  };
}

/** Who is working the item; the All tab names its field differently, so the field is the caller's. */
export function assigneeColumn<T extends { assigned_name: string | null }>(t: Translate, field: 'assigned_user_id' | 'assigned_name' = 'assigned_user_id'): DuncitColumn<T> {
  return {
    field,
    headerName: t('marketing.inbox.colAssignee'),
    type: 'text',
    minWidth: 140,
    sortable: false,
    filterable: false,
    valueGetter: (row) => row.assigned_name || t('marketing.inbox.nobody'),
  };
}
