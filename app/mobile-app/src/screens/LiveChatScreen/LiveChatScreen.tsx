import { useEffect, useRef, useState } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView as RNScrollView,
} from 'react-native';
import { Text, YStack } from 'tamagui';

import { StackScreen } from '@/components/StackScreen';
import { SupportChatComposer } from '@/components/support-chat/SupportChatComposer';
import { JumpToLatestButton } from '@/components/support-chat/JumpToLatestButton';
import { useSupportChat } from '@/hooks/useSupportChat';
import { useAppSettings } from '@/hooks/useAppSettings';
import { TranscriptFormat } from '@/generated/graphql/graphql';
import { canReopen } from '@/utils/support-chat';
import { formatDateTime } from '@/utils/date-format';
import { ChatBody } from './ChatBody';
import { ChatHeaderActions } from './ChatHeaderActions';
import { ClosedNote } from './ClosedNote';
import { ChatModals } from './ChatModals';
import { useLiveChatActions } from './useLiveChatActions';
import { useChatAttachments } from './useChatAttachments';

/** Live chat — real-time support with AI-first replies, read receipts, resolve/
 * reopen, feedback, attachments and transcript export. mWeb twin of the chat. */
export function LiveChatScreen() {
  const chat = useSupportChat();
  const {
    session,
    messages,
    isLoading,
    error,
    typing,
    aiThinking,
    retry,
    uploadAttachment,
    emitTyping,
  } = chat;
  const { timeZone } = useAppSettings();
  const [showJump, setShowJump] = useState(false);
  const scrollRef = useRef<RNScrollView>(null);

  /* istanbul ignore next -- native autoscroll; method absent under the test renderer */
  const scrollToEnd = (animated: boolean) => scrollRef.current?.scrollToEnd({ animated });
  /* istanbul ignore next -- fired by native layout, not by the test renderer */
  const handleContentSizeChange = () => scrollToEnd(false);

  const a = useLiveChatActions(chat, scrollToEnd);
  const { busy, setBusy, sendError, setSendError, submit } = a;

  const closed = session?.status === 'CLOSED';
  const reopenAllowed = closed && canReopen(session?.reopen_deadline);
  const reopenDeadlineLabel = session?.reopen_deadline
    ? formatDateTime(session.reopen_deadline)
    : '';

  // Auto-open the feedback form once a chat is resolved and not yet rated (B8).
  const needsFeedback = closed && session?.rating == null;
  const openFeedback = a.feedback.setOpen;
  useEffect(() => {
    if (needsFeedback) openFeedback(true);
  }, [needsFeedback, openFeedback]);

  const { attach, attachDocument } = useChatAttachments({
    uploadAttachment,
    submit,
    setBusy,
    setSendError,
  });

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentSize, layoutMeasurement, contentOffset } = e.nativeEvent;
    setShowJump(contentSize.height - layoutMeasurement.height - contentOffset.y > 160);
  };

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

  const headerActions = (
    <ChatHeaderActions
      showToggle={!!showToggle}
      closed={!!closed}
      onToggle={onToggle}
      onDownloadTxt={() => void a.download(TranscriptFormat.Txt)}
      onDownloadDocx={() => void a.download(TranscriptFormat.Docx)}
      onEmail={openEmail}
    />
  );

  return (
    <StackScreen
      title="Chat with Us"
      testID="live-chat-screen"
      right={session ? headerActions : undefined}
    >
      <YStack flex={1}>
        {session?.ticket_no ? (
          <Text
            testID="chat-ticket-no"
            fontSize={12}
            color="$muted"
            paddingHorizontal={16}
            paddingTop={8}
          >
            {session.ticket_no} · {closed ? 'Resolved' : 'Open'}
          </Text>
        ) : null}

        <ChatBody
          ref={scrollRef}
          isLoading={isLoading}
          error={error}
          messages={messages}
          session={session}
          timeZone={timeZone}
          typing={typing}
          aiThinking={aiThinking}
          onRetry={(m) => void retry(m)}
          onScroll={onScroll}
          onContentSizeChange={handleContentSizeChange}
        />

        {showJump ? (
          <JumpToLatestButton
            testID="chat-jump-bottom"
            bottom={84}
            onPress={() => scrollToEnd(true)}
          />
        ) : null}

        {sendError ? (
          <Text
            testID="support-chat-send-error"
            color="$danger"
            fontSize={12}
            paddingHorizontal={16}
          >
            {sendError}
          </Text>
        ) : null}

        {closed ? (
          <ClosedNote reopenAllowed={!!reopenAllowed} deadlineLabel={reopenDeadlineLabel} />
        ) : null}

        <SupportChatComposer
          busy={busy}
          locked={!!closed}
          onSendText={(t) => void submit(t)}
          onAttach={() => void attach()}
          onAttachDocument={() => void attachDocument()}
          onTyping={emitTyping}
        />
      </YStack>

      <ChatModals
        actions={a}
        rating={session?.rating}
        feedbackComment={session?.feedback_comment}
        reopenDeadlineLabel={reopenDeadlineLabel}
      />
    </StackScreen>
  );
}
