import { dateColumn, type DuncitColumn } from '@duncit/table';
import type { Translate } from '@duncit/shell';
import { ClampedText } from '../social-accounts-page/SocialCells';
import { EnumChip } from '../social-accounts-page/monitoring/CommentCells';
import { SEVERITY_COLORS, SEVERITY_LABEL, enumOptions } from '../social-accounts-page/copy';
import type { SocialSeverity } from '../social-accounts-page/queries';
import { accountColumn, assigneeColumn, networkColumn, sentimentColumn, statusColumn } from './inboxColumnKit';
import type { InboxAccount, InboxComment } from './queries';

const SEVERITIES: readonly SocialSeverity[] = ['HIGH', 'MEDIUM', 'LOW'];

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
    networkColumn<InboxComment>(t),
    accountColumn<InboxComment>(accounts, t),
    {
      field: 'author_name',
      headerName: t('marketing.inbox.colAuthor'),
      type: 'text',
      minWidth: 140,
      sortable: false,
      filterable: false,
      valueGetter: (row) => row.author_name || row.author_handle || t('marketing.inbox.unknownAuthor'),
    },
    sentimentColumn<InboxComment>(t),
    {
      field: 'ai_severity',
      headerName: t('marketing.inbox.colSeverity'),
      type: 'enum',
      width: 130,
      sortable: false,
      options: enumOptions(SEVERITIES, SEVERITY_LABEL, t),
      cellRenderer: (row) => <EnumChip value={row.ai_severity} colors={SEVERITY_COLORS} labels={SEVERITY_LABEL} t={t} />,
    },
    statusColumn<InboxComment>(t),
    assigneeColumn<InboxComment>(t),
    dateColumn<InboxComment>({ field: 'published_at', headerName: t('marketing.inbox.colTime'), hide: false, width: 170 }),
  ];
}
