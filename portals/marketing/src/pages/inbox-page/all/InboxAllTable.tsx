import { useMemo, type ReactNode, type RefObject } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Chip } from '@mui/material';
import { DuncitTable, dateColumn, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import type { Translate } from '@duncit/shell';
import { useTranslation } from '@duncit/app-settings';
import { ClampedText, PlatformCell } from '../../social-accounts-page/SocialCells';
import { EnumChip } from '../../social-accounts-page/monitoring/CommentCells';
import { PLATFORM_LABEL, SENTIMENT_COLORS, SENTIMENT_LABEL } from '../../social-accounts-page/copy';
import { INBOX_STATUS_COLORS, INBOX_STATUS_LABEL, ITEM_KIND_LABEL } from '../copy';
import { SOCIAL_INBOX_ITEMS_TABLE, type SocialInboxItem } from '../dm.queries';
import type { SocialInboxView } from '../queries';

const getRowId = (row: SocialInboxItem) => `${row.kind}-${row.id}`;

/** One row per comment, Threads reply or conversation: what kind, who, what, where it stands. Search only — the mix has no common filters. */
export function getAllColumns(t: Translate): DuncitColumn<SocialInboxItem>[] {
  const fixed = { sortable: false, filterable: false } as const;
  return [
    {
      field: 'kind',
      headerName: t('marketing.inbox.colKind'),
      type: 'text',
      width: 140,
      ...fixed,
      cellRenderer: (row) => <Chip size="small" variant="outlined" label={t(ITEM_KIND_LABEL[row.kind])} />,
      valueGetter: (row) => t(ITEM_KIND_LABEL[row.kind]),
    },
    {
      field: 'text',
      headerName: t('marketing.inbox.colMessage'),
      type: 'text',
      flex: 1,
      minWidth: 260,
      ...fixed,
      cellRenderer: (row) => <ClampedText text={row.text} secondary={row.author || t('marketing.inbox.unknownAuthor')} />,
      valueGetter: (row) => row.text,
    },
    {
      field: 'platform',
      headerName: t('marketing.inbox.colNetwork'),
      type: 'text',
      width: 150,
      ...fixed,
      cellRenderer: (row) => <PlatformCell platform={row.platform} label={t(PLATFORM_LABEL[row.platform])} />,
      valueGetter: (row) => t(PLATFORM_LABEL[row.platform]),
    },
    { field: 'account_name', headerName: t('marketing.inbox.colAccount'), type: 'text', minWidth: 160, ...fixed, valueGetter: (row) => row.account_name },
    {
      field: 'ai_sentiment',
      headerName: t('marketing.inbox.colSentiment'),
      type: 'text',
      width: 140,
      ...fixed,
      cellRenderer: (row) => <EnumChip value={row.ai_sentiment} colors={SENTIMENT_COLORS} labels={SENTIMENT_LABEL} t={t} />,
    },
    {
      field: 'status',
      headerName: t('marketing.inbox.colStatus'),
      type: 'text',
      width: 130,
      ...fixed,
      cellRenderer: (row) => <StatusChip status={row.status} colorMap={INBOX_STATUS_COLORS} label={t(INBOX_STATUS_LABEL[row.status])} />,
      valueGetter: (row) => t(INBOX_STATUS_LABEL[row.status]),
    },
    { field: 'assigned_name', headerName: t('marketing.inbox.colAssignee'), type: 'text', minWidth: 140, ...fixed, valueGetter: (row) => row.assigned_name || t('marketing.inbox.nobody') },
    dateColumn<SocialInboxItem>({ field: 'at', headerName: t('marketing.inbox.colLastAt'), hide: false, width: 170, sortable: false, filterable: false }),
  ];
}

interface Props {
  view: SocialInboxView;
  onOpen: (row: SocialInboxItem) => void;
  refetchRef: RefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
}

/** The All tab: comments, Threads replies and DMs in one queue, newest first; a row opens the comment or the conversation. */
export default function InboxAllTable({ view, onOpen, refetchRef, toolbarActions }: Readonly<Props>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const fetchRows = useApolloTableFetch<SocialInboxItem>(client, SOCIAL_INBOX_ITEMS_TABLE, 'socialInboxItemsTable', { extraVariables: { view } }, [view]);
  const columns = useMemo(() => getAllColumns(t), [t]);

  return (
    <DuncitTable<SocialInboxItem>
      key={view}
      ariaLabel={t('marketing.inbox.allTableLabel')}
      tableId="marketing-inbox-all"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      onRowClick={onOpen}
      refetchRef={refetchRef}
      toolbarActions={toolbarActions}
      emptyText={t('marketing.inbox.allEmpty')}
      searchPlaceholder={t('marketing.inbox.allSearch')}
    />
  );
}
