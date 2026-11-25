import type { ReactNode, RefObject } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { notify } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import InboxAllTable from './all/InboxAllTable';
import { COMMENT_CHANNEL } from './copy';
import type { InboxChannel, SocialInboxItem } from './dm.queries';
import ConversationTable from './dms/ConversationTable';
import InboxTable from './InboxTable';
import { SOCIAL_INBOX_COMMENT, type InboxAccount, type InboxComment, type SocialInboxView } from './queries';

interface Props {
  channel: InboxChannel;
  view: SocialInboxView;
  accounts: readonly InboxAccount[];
  onOpenComment: (comment: InboxComment) => void;
  onOpenConversation: (id: string) => void;
  refetchRef: RefObject<(() => void) | null>;
  toolbarActions: ReactNode;
}

/** The queue for the tab the URL names: everything, DMs, comments, or Threads replies. */
export default function InboxChannelPanel({ channel, view, accounts, onOpenComment, onOpenConversation, refetchRef, toolbarActions }: Readonly<Props>) {
  const client = useApolloClient();

  // A row of the All tab is a conversation (opened by id) or a comment (read in full, then opened in its drawer).
  const openItem = (item: SocialInboxItem) => {
    if (item.kind === 'DM') {
      onOpenConversation(item.id);
      return;
    }
    client.query<{ socialInboxComment: InboxComment }>({ query: SOCIAL_INBOX_COMMENT, variables: { id: item.id }, fetchPolicy: 'network-only' }).then(
      ({ data }) => {
        if (data?.socialInboxComment) onOpenComment(data.socialInboxComment);
      },
      (err: unknown) => notify(parseApiError(err), 'error')
    );
  };

  if (channel === 'all') return <InboxAllTable view={view} onOpen={openItem} refetchRef={refetchRef} toolbarActions={toolbarActions} />;
  if (channel === 'dms') {
    return <ConversationTable view={view} accounts={accounts} onOpen={(row) => onOpenConversation(row.id)} refetchRef={refetchRef} toolbarActions={toolbarActions} />;
  }
  return (
    <InboxTable view={view} channel={COMMENT_CHANNEL[channel]} accounts={accounts} onOpen={onOpenComment} refetchRef={refetchRef} toolbarActions={toolbarActions} />
  );
}
