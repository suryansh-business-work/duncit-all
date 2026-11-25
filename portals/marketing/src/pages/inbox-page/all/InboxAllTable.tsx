import { useMemo, type ReactNode, type RefObject } from 'react';
import { Chip } from '@mui/material';
import { dateColumn, type DuncitColumn } from '@duncit/table';
import type { Translate } from '@duncit/shell';
import { useTranslation } from '@duncit/app-settings';
import { ClampedText } from '../../social-accounts-page/SocialCells';
import { ITEM_KIND_LABEL } from '../copy';
import { assigneeColumn, networkColumn, sentimentColumn, statusColumn } from '../inboxColumnKit';
import { SOCIAL_INBOX_ITEMS_TABLE, type SocialInboxItem } from '../dm.queries';
import InboxQueueTable from '../InboxQueueTable';
import type { SocialInboxView } from '../queries';

const getRowId = (row: SocialInboxItem) => `${row.kind}-${row.id}`;

/** One row per comment, Threads reply or conversation: what kind, who, what, where it stands. Search only — the mix has no common filters. */
export function getAllColumns(t: Translate): DuncitColumn<SocialInboxItem>[] {
  const fixed = { sortable: false, filterable: false } as const;
  const noFilter = { filterable: false };
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
    networkColumn<SocialInboxItem>(t, undefined, noFilter),
    { field: 'account_name', headerName: t('marketing.inbox.colAccount'), type: 'text', minWidth: 160, ...fixed, valueGetter: (row) => row.account_name },
    sentimentColumn<SocialInboxItem>(t, noFilter),
    statusColumn<SocialInboxItem>(t, noFilter),
    assigneeColumn<SocialInboxItem>(t, 'assigned_name'),
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
  const columns = useMemo(() => getAllColumns(t), [t]);
  return (
    <InboxQueueTable<SocialInboxItem>
      query={SOCIAL_INBOX_ITEMS_TABLE}
      field="socialInboxItemsTable"
      variables={{ view }}
      tableId="marketing-inbox-all"
      ariaLabel={t('marketing.inbox.allTableLabel')}
      emptyText={t('marketing.inbox.allEmpty')}
      searchPlaceholder={t('marketing.inbox.allSearch')}
      columns={columns}
      getRowId={getRowId}
      onOpen={onOpen}
      refetchRef={refetchRef}
      toolbarActions={toolbarActions}
    />
  );
}
