import { useMemo, type ReactNode, type RefObject } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import { getInboxColumns } from './inboxColumns';
import { SOCIAL_INBOX_TABLE, type InboxAccount, type InboxComment, type SocialInboxView } from './queries';

const getRowId = (row: InboxComment) => row.id;

interface Props {
  view: SocialInboxView;
  accounts: readonly InboxAccount[];
  onOpen: (row: InboxComment) => void;
  refetchRef: RefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
}

/** The queue, server-paged, newest first, on the slice the URL names; a row opens the comment. */
export default function InboxTable({ view, accounts, onOpen, refetchRef, toolbarActions }: Readonly<Props>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const fetchRows = useApolloTableFetch<InboxComment>(client, SOCIAL_INBOX_TABLE, 'socialInboxTable', { extraVariables: { view } }, [view]);
  const columns = useMemo(() => getInboxColumns(accounts, t), [accounts, t]);

  return (
    <DuncitTable<InboxComment>
      key={view}
      ariaLabel={t('marketing.inbox.tableLabel')}
      tableId="marketing-inbox"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      onRowClick={onOpen}
      refetchRef={refetchRef}
      toolbarActions={toolbarActions}
      emptyText={t('marketing.inbox.empty')}
      searchPlaceholder={t('marketing.inbox.search')}
      defaultSort={{ field: 'published_at', dir: 'desc' }}
    />
  );
}
