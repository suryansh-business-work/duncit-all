import { useMemo, type ReactNode, type RefObject } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import { SOCIAL_CONVERSATIONS_TABLE, type SocialConversation } from '../dm.queries';
import type { InboxAccount, SocialInboxView } from '../queries';
import { getConversationColumns } from './conversationColumns';

const getRowId = (row: SocialConversation) => row.id;

interface Props {
  view: SocialInboxView;
  accounts: readonly InboxAccount[];
  onOpen: (row: SocialConversation) => void;
  refetchRef: RefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
}

/** The DM queue, server-paged, latest message first, on the slice the URL names; a row opens the conversation. */
export default function ConversationTable({ view, accounts, onOpen, refetchRef, toolbarActions }: Readonly<Props>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const fetchRows = useApolloTableFetch<SocialConversation>(client, SOCIAL_CONVERSATIONS_TABLE, 'socialConversationsTable', { extraVariables: { view } }, [view]);
  const columns = useMemo(() => getConversationColumns(accounts, t), [accounts, t]);

  return (
    <DuncitTable<SocialConversation>
      key={view}
      ariaLabel={t('marketing.inbox.dmTableLabel')}
      tableId="marketing-inbox-dms"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      onRowClick={onOpen}
      refetchRef={refetchRef}
      toolbarActions={toolbarActions}
      emptyText={t('marketing.inbox.dmEmpty')}
      searchPlaceholder={t('marketing.inbox.dmSearch')}
      defaultSort={{ field: 'last_message_at', dir: 'desc' }}
    />
  );
}
