import { useMemo, type ReactNode, type RefObject } from 'react';
import { useTranslation } from '@duncit/app-settings';
import { SOCIAL_CONVERSATIONS_TABLE, type SocialConversation } from '../dm.queries';
import InboxQueueTable from '../InboxQueueTable';
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

/** The DM queue, latest message first, on the slice the URL names; a row opens the conversation. */
export default function ConversationTable({ view, accounts, onOpen, refetchRef, toolbarActions }: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo(() => getConversationColumns(accounts, t), [accounts, t]);
  return (
    <InboxQueueTable<SocialConversation>
      query={SOCIAL_CONVERSATIONS_TABLE}
      field="socialConversationsTable"
      variables={{ view }}
      tableId="marketing-inbox-dms"
      ariaLabel={t('marketing.inbox.dmTableLabel')}
      emptyText={t('marketing.inbox.dmEmpty')}
      searchPlaceholder={t('marketing.inbox.dmSearch')}
      columns={columns}
      getRowId={getRowId}
      onOpen={onOpen}
      refetchRef={refetchRef}
      toolbarActions={toolbarActions}
      defaultSort={{ field: 'last_message_at', dir: 'desc' }}
    />
  );
}
