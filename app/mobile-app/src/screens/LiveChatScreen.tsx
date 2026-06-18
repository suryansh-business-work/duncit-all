import { useRef, useState, type ReactNode } from 'react';
import {
  ScrollView as RNScrollView,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';

import { StackScreen } from '@/components/StackScreen';
import { SupportChatBubble } from '@/components/support-chat/SupportChatBubble';
import { SupportChatComposer } from '@/components/support-chat/SupportChatComposer';
import {
  SupportFeedbackModal,
  EmailTranscriptModal,
} from '@/components/support-chat/SupportChatModals';
import { useSupportChat } from '@/hooks/useSupportChat';
import { useThemeColors } from '@/hooks/useThemeColors';
import { dayLabel, showDaySeparator } from '@/utils/support-chat';
import { shareTranscript } from '@/utils/transcript';
import { toErrorMessage } from '@/utils/errors';

/** Live chat — real-time support with AI-first replies, read receipts, resolve/
 * reopen, feedback, attachments and transcript export. mWeb twin of the chat. */
export function LiveChatScreen() {
  const {
    session,
    messages,
    isLoading,
    error,
    typing,
    send,
    uploadAttachment,
    emitTyping,
    resolve,
    reopen,
    submitFeedback,
    getTranscript,
    emailTranscript,
  } = useSupportChat();
  const { onPrimary, color: ink } = useThemeColors();
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState('');
  const [showJump, setShowJump] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailDone, setEmailDone] = useState(false);
  const [emailError, setEmailError] = useState('');
  const scrollRef = useRef<RNScrollView>(null);

  /* istanbul ignore next -- native autoscroll; method absent under the test renderer */
  const scrollToEnd = (animated: boolean) => scrollRef.current?.scrollToEnd({ animated });
  /* istanbul ignore next -- fired by native layout, not by the test renderer */
  const handleContentSizeChange = () => scrollToEnd(false);

  const closed = session?.status === 'CLOSED';

  const submit = async (text: string, attachments: string[] = []) => {
    if (busy) return;
    setBusy(true);
    setSendError('');
    try {
      await send(text, attachments);
      scrollToEnd(true);
    } catch (e) {
      setSendError(toErrorMessage(e, 'Could not send the message.'));
    } finally {
      setBusy(false);
    }
  };

  const attach = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setSendError('Photo access is needed to attach a file.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      base64: true,
      quality: 0.8,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;
    setBusy(true);
    setSendError('');
    try {
      const url = await uploadAttachment(asset);
      setBusy(false);
      await submit('', [url]);
    } catch (e) {
      setSendError(toErrorMessage(e, 'Could not attach the file.'));
      setBusy(false);
    }
  };

  const onResolve = async () => {
    await resolve();
    setFeedbackOpen(true);
  };
  const onDownload = async () => {
    const t = await getTranscript();
    if (t) await shareTranscript(t.filename, t.text);
  };
  const onFeedback = async (rating: number, comment: string) => {
    setFeedbackBusy(true);
    try {
      await submitFeedback(rating, comment);
      setFeedbackOpen(false);
    } finally {
      setFeedbackBusy(false);
    }
  };
  const onEmail = async (email: string) => {
    setEmailBusy(true);
    setEmailError('');
    try {
      await emailTranscript(email);
      setEmailDone(true);
    } catch (e) {
      setEmailError(toErrorMessage(e, 'Could not email the transcript.'));
    } finally {
      setEmailBusy(false);
    }
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentSize, layoutMeasurement, contentOffset } = e.nativeEvent;
    setShowJump(contentSize.height - layoutMeasurement.height - contentOffset.y > 160);
  };

  let chatBody: ReactNode;
  if (isLoading) {
    chatBody = (
      <YStack flex={1} alignItems="center" justifyContent="center">
        <Spinner size="large" testID="support-chat-loading" />
      </YStack>
    );
  } else if (error) {
    chatBody = (
      <Text testID="support-chat-error" color="$muted" textAlign="center" padding={24}>
        {error}
      </Text>
    );
  } else {
    chatBody = (
      <ScrollView
        ref={scrollRef}
        flex={1}
        onScroll={onScroll}
        scrollEventThrottle={64}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        onContentSizeChange={handleContentSizeChange}
      >
        {messages.length === 0 ? (
          <Text testID="support-chat-empty" color="$muted" textAlign="center" padding={24}>
            Say hello — our assistant replies instantly and connects you to a human when needed.
          </Text>
        ) : (
          messages.map((m, i) => (
            <YStack key={m.id} gap={6}>
              {showDaySeparator(m.created_at, messages[i - 1]?.created_at) && (
                <Text
                  testID={`day-${m.id}`}
                  fontSize={11}
                  fontWeight="800"
                  color="$muted"
                  textAlign="center"
                >
                  {dayLabel(m.created_at)}
                </Text>
              )}
              <SupportChatBubble message={m} agentLastReadAt={session?.agent_last_read_at} />
            </YStack>
          ))
        )}
        {typing ? (
          <Text
            testID="support-typing"
            fontSize={12}
            fontStyle="italic"
            color="$muted"
            paddingHorizontal={4}
          >
            Support is typing…
          </Text>
        ) : null}
      </ScrollView>
    );
  }

  const headerActions = (
    <XStack gap={6} alignItems="center">
      <XStack
        testID="chat-action-toggle"
        role="button"
        aria-label={closed ? 'Re-open chat' : 'Mark resolved'}
        onPress={() => void (closed ? reopen() : onResolve())}
        padding={6}
      >
        <MaterialIcons name={closed ? 'replay' : 'check-circle'} size={20} color={ink} />
      </XStack>
      <XStack
        testID="chat-action-download"
        role="button"
        aria-label="Download transcript"
        onPress={() => void onDownload()}
        padding={6}
      >
        <MaterialIcons name="file-download" size={20} color={ink} />
      </XStack>
      <XStack
        testID="chat-action-email"
        role="button"
        aria-label="Email transcript"
        onPress={() => {
          setEmailDone(false);
          setEmailError('');
          setEmailOpen(true);
        }}
        padding={6}
      >
        <MaterialIcons name="email" size={20} color={ink} />
      </XStack>
    </XStack>
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

        {chatBody}

        {showJump ? (
          <XStack
            testID="chat-jump-bottom"
            role="button"
            aria-label="Jump to latest"
            onPress={() => scrollToEnd(true)}
            position="absolute"
            right={16}
            bottom={84}
            width={40}
            height={40}
            alignItems="center"
            justifyContent="center"
            borderRadius={20}
            backgroundColor="$primary"
          >
            <MaterialIcons name="keyboard-arrow-down" size={24} color={onPrimary} />
          </XStack>
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
          <Text
            testID="chat-closed-note"
            fontSize={12}
            color="$muted"
            textAlign="center"
            padding={6}
          >
            This chat is resolved — send a message or re-open it if you still need help.
          </Text>
        ) : null}

        <SupportChatComposer
          busy={busy}
          onSendText={(t) => void submit(t)}
          onAttach={() => void attach()}
          onTyping={emitTyping}
        />
      </YStack>

      <SupportFeedbackModal
        open={feedbackOpen}
        busy={feedbackBusy}
        onSubmit={(r, c) => void onFeedback(r, c)}
        onClose={() => setFeedbackOpen(false)}
      />
      <EmailTranscriptModal
        open={emailOpen}
        busy={emailBusy}
        done={emailDone}
        error={emailError}
        onSend={(em) => void onEmail(em)}
        onClose={() => setEmailOpen(false)}
      />
    </StackScreen>
  );
}
