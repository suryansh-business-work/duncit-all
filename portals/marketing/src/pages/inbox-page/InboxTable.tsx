import { useMemo, type ReactNode, type RefObject } from 'react';
import { useTranslation } from '@duncit/app-settings';
import { getInboxColumns } from './inboxColumns';
import InboxQueueTable from './InboxQueueTable';
import { SOCIAL_INBOX_TABLE, type InboxAccount, type InboxComment, type SocialInboxView } from './queries';

const getRowId = (row: InboxComment) => row.id;

interface Props {
  view: SocialInboxView;
  /** Every network's comments, or Threads replies on their own. */
  channel: 'COMMENTS' | 'THREADS_REPLIES';
  accounts: readonly InboxAccount[];
  onOpen: (row: InboxComment) => void;
  refetchRef: RefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
}

/** The comment queue, newest first, on the slice the URL names; a row opens the comment. */
export default function InboxTable({ view, channel, accounts, onOpen, refetchRef, toolbarActions }: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo(() => getInboxColumns(accounts, t), [accounts, t]);
  return (
    <InboxQueueTable<InboxComment>
      query={SOCIAL_INBOX_TABLE}
      field="socialInboxTable"
      variables={{ view, channel }}
      tableId={channel === 'THREADS_REPLIES' ? 'marketing-inbox-threads' : 'marketing-inbox'}
      ariaLabel={t('marketing.inbox.tableLabel')}
      emptyText={t('marketing.inbox.empty')}
      searchPlaceholder={t('marketing.inbox.search')}
      columns={columns}
      getRowId={getRowId}
      onOpen={onOpen}
      refetchRef={refetchRef}
      toolbarActions={toolbarActions}
      defaultSort={{ field: 'published_at', dir: 'desc' }}
    />
  );
}
