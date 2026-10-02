import { TranscriptFormat } from '@/generated/graphql/graphql';
import { fireAndForget } from '@/utils/fire-and-forget';

import { ChatHeaderActions } from './ChatHeaderActions';
import type { useLiveChatActions } from './useLiveChatActions';

interface LiveChatHeaderProps {
  actions: ReturnType<typeof useLiveChatActions>;
  closed: boolean;
  reopenAllowed: boolean;
}

/** The header's resolve/reopen toggle and transcript download + email actions. */
export function LiveChatHeader({
  actions: a,
  closed,
  reopenAllowed,
}: Readonly<LiveChatHeaderProps>) {
  const showToggle = closed ? reopenAllowed : true;
  const onToggle = () => {
    if (closed) {
      a.reopen.setError('');
      a.reopen.setOpen(true);
    } else {
      a.confirm.setOpen(true);
    }
  };
  const openEmail = () => {
    a.email.setDone(false);
    a.email.setError('');
    a.email.setOpen(true);
  };

  return (
    <ChatHeaderActions
      showToggle={!!showToggle}
      closed={!!closed}
      onToggle={onToggle}
      onDownloadTxt={() => fireAndForget(a.download(TranscriptFormat.Txt))}
      onDownloadDocx={() => fireAndForget(a.download(TranscriptFormat.Docx))}
      onEmail={openEmail}
    />
  );
}
