import { XStack } from 'tamagui';

import { SupportChatMute } from '@/components/chat/SupportChatMute';
import { TranscriptFormat } from '@/generated/graphql/graphql';
import { fireAndForget } from '@/utils/fire-and-forget';

import { ChatHeaderActions } from './ChatHeaderActions';
import type { useLiveChatActions } from './useLiveChatActions';

interface LiveChatHeaderProps {
  actions: ReturnType<typeof useLiveChatActions>;
  closed: boolean;
  reopenAllowed: boolean;
  /** The session the mute bell is about. */
  sessionId: string;
  /** Where a failed mute change is said. */
  onMuteError: (message: string) => void;
}

/** The header's mute bell, resolve/reopen toggle and transcript download + email actions. */
export function LiveChatHeader({
  actions: a,
  closed,
  reopenAllowed,
  sessionId,
  onMuteError,
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
    <XStack gap={6} alignItems="center">
      <SupportChatMute sessionId={sessionId} onError={onMuteError} />
      <ChatHeaderActions
        showToggle={!!showToggle}
        closed={!!closed}
        onToggle={onToggle}
        onDownloadTxt={() => fireAndForget(a.download(TranscriptFormat.Txt))}
        onDownloadDocx={() => fireAndForget(a.download(TranscriptFormat.Docx))}
        onEmail={openEmail}
      />
    </XStack>
  );
}
