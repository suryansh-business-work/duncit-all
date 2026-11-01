import { dateColumn, type DuncitColumn } from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import type { Translate } from '@duncit/shell';
import { ClampedText, PlatformCell } from '../social-accounts-page/SocialCells';
import { EnumChip } from '../social-accounts-page/monitoring/CommentCells';
import {
  PLATFORMS,
  PLATFORM_LABEL,
  SENTIMENT_COLORS,
  SENTIMENT_LABEL,
  SEVERITY_COLORS,
  SEVERITY_LABEL,
  enumOptions,
} from '../social-accounts-page/copy';
import type { SocialSentiment, SocialSeverity } from '../social-accounts-page/queries';
import { INBOX_STATUSES, INBOX_STATUS_COLORS, INBOX_STATUS_LABEL } from './copy';
import type { InboxAccount, InboxComment } from './queries';

const SEVERITIES: readonly SocialSeverity[] = ['HIGH', 'MEDIUM', 'LOW'];
const SENTIMENTS: readonly SocialSentiment[] = ['NEGATIVE', 'NEUTRAL', 'POSITIVE'];

/** The queue's columns: what was said, where, how it reads, where it stands and who has it. */
export function getInboxColumns(accounts: readonly InboxAccount[], t: Translate): DuncitColumn<InboxComment>[] {
  return [
    {
      field: 'text',
      headerName: t('marketing.inbox.colComment'),
      type: 'text',
      flex: 1,
      minWidth: 260,
      sortable: false,
      filterable: false,
      cellRenderer: (row) => <ClampedText text={row.text} secondary={row.post_text} />,
      valueGetter: (row) => row.text,
    },
    {
      field: 'platform',
      headerName: t('marketing.inbox.colNetwork'),
      type: 'enum',
      width: 150,
      sortable: false,
      options: enumOptions(PLATFORMS, PLATFORM_LABEL, t),
      cellRenderer: (row) => <PlatformCell platform={row.platform} label={t(PLATFORM_LABEL[row.platform])} />,
      valueGetter: (row) => t(PLATFORM_LABEL[row.platform]),
    },
    {
      field: 'account_id',
      headerName: t('marketing.inbox.colAccount'),
      type: 'enum',
      minWidth: 160,
      sortable: false,
      options: accounts.map((account) => ({ value: account.id, label: account.name })),
      valueGetter: (row) => row.account_name,
    },
    {
      field: 'author_name',
      headerName: t('marketing.inbox.colAuthor'),
      type: 'text',
      minWidth: 140,
      sortable: false,
      filterable: false,
      valueGetter: (row) => row.author_name || row.author_handle || t('marketing.inbox.unknownAuthor'),
    },
    {
      field: 'ai_sentiment',
      headerName: t('marketing.inbox.colSentiment'),
      type: 'enum',
      width: 140,
      sortable: false,
      options: enumOptions(SENTIMENTS, SENTIMENT_LABEL, t),
      cellRenderer: (row) => <EnumChip value={row.ai_sentiment} colors={SENTIMENT_COLORS} labels={SENTIMENT_LABEL} t={t} />,
    },
    {
      field: 'ai_severity',
      headerName: t('marketing.inbox.colSeverity'),
      type: 'enum',
      width: 130,
      sortable: false,
      options: enumOptions(SEVERITIES, SEVERITY_LABEL, t),
      cellRenderer: (row) => <EnumChip value={row.ai_severity} colors={SEVERITY_COLORS} labels={SEVERITY_LABEL} t={t} />,
    },
    {
      field: 'status',
      headerName: t('marketing.inbox.colStatus'),
      type: 'enum',
      width: 130,
      sortable: false,
      options: enumOptions(INBOX_STATUSES, INBOX_STATUS_LABEL, t),
      cellRenderer: (row) => <StatusChip status={row.status} colorMap={INBOX_STATUS_COLORS} label={t(INBOX_STATUS_LABEL[row.status])} />,
      valueGetter: (row) => t(INBOX_STATUS_LABEL[row.status]),
    },
    {
      field: 'assigned_user_id',
      headerName: t('marketing.inbox.colAssignee'),
      type: 'text',
      minWidth: 140,
      sortable: false,
      filterable: false,
      valueGetter: (row) => row.assigned_name || t('marketing.inbox.nobody'),
    },
    dateColumn<InboxComment>({ field: 'published_at', headerName: t('marketing.inbox.colTime'), hide: false, width: 170 }),
  ];
}
