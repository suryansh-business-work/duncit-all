import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Spinner, Text, YStack } from 'tamagui';
import { unavailableKey, type AskDuncitAttachmentView } from '@duncit/utils';

import { AskComposer } from '@/components/ask-duncit/AskComposer';
import { AskHandoverSheet } from '@/components/ask-duncit/AskHandoverSheet';
import { AskHeader } from '@/components/ask-duncit/AskHeader';
import { AskHistorySheet } from '@/components/ask-duncit/AskHistorySheet';
import { AskMessageList } from '@/components/ask-duncit/AskMessageList';
import {
  AskAlertsBar,
  AskEmptyState,
  AskSuggestionBubbles,
} from '@/components/ask-duncit/AskSuggestions';
import { DuncitButton } from '@/components/DuncitButton';
import { useAskDuncit } from '@/hooks/useAskDuncit';
import { useAskDuncitVoice } from '@/hooks/useAskDuncitVoice';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { fireAndForget } from '@/utils/fire-and-forget';

type Route = RouteProp<RootStackParamList, 'AskDuncit'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'AskDuncit'>;

/**
 * Ask Duncit on native — the Tamagui twin of mWeb's AskDuncitPage: same
 * server, same shared thread reducers, same features and copy keys.
 */
export function AskDuncitScreen() {
  const { t } = useTranslation();
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const conversationId = route.params?.conversationId ?? null;
  const from = route.params?.from ?? null;
  const [historyOpen, setHistoryOpen] = useState(false);
  const [handoverOpen, setHandoverOpen] = useState(false);
  const openConversation = useCallback(
    (id: string | null) =>
      navigation.setParams({ conversationId: id ?? undefined, from: from ?? undefined }),
    [navigation, from],
  );
  const ai = useAskDuncit({ conversationId, from, onConversationCreated: openConversation });
  const voice = useAskDuncitVoice(ai.bootstrap?.role_key ?? 'MEMBER');
  const { bootstrap, thread } = ai;

  const send = useCallback(
    (text: string, attachments: AskDuncitAttachmentView[] = []) =>
      fireAndForget(ai.send(text, attachments)),
    [ai],
  );
  const speak = useCallback(
    (id: string, text: string) => fireAndForget(voice.speak(id, text)),
    [voice],
  );

  if (!bootstrap && !ai.bootstrapError) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center">
        <Spinner size="large" aria-label={t('askDuncit.loading')} />
      </YStack>
    );
  }
  if (!bootstrap) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" gap={12} padding={24}>
        <Text color="$danger" role="alert">
          {t('askDuncit.errors.INTERNAL')}
        </Text>
        <DuncitButton
          label={t('askDuncit.retry')}
          onPress={() => fireAndForget(ai.retryBootstrap())}
        />
      </YStack>
    );
  }

  const streaming = Boolean(thread.streamingId);
  const { features } = bootstrap;
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <YStack flex={1} backgroundColor="$background" testID="ask-duncit-screen">
        <AskHeader
          roleKey={bootstrap.role_key}
          showHistory={features.chat_history}
          canHandOver={features.handover && Boolean(thread.conversationId)}
          onHistory={() => setHistoryOpen(true)}
          onNew={() => openConversation(null)}
          onHandOver={() => setHandoverOpen(true)}
        />
        {bootstrap.available ? (
          <>
            <AskAlertsBar alerts={bootstrap.alerts} onAsk={send} />
            {ai.loadError && (
              <Text color="$danger" padding={12} role="alert">
                {t('askDuncit.errors.INTERNAL')}
              </Text>
            )}
            <AskMessageList
              messages={thread.messages}
              hasMore={thread.hasMore}
              loadingOlder={ai.loading}
              canRollback={features.rollback}
              voice={features.voice}
              speakingId={voice.speakingId}
              empty={<AskEmptyState />}
              onLoadOlder={() => fireAndForget(ai.loadOlder())}
              onDecide={(id, approve) => fireAndForget(ai.decide(id, approve))}
              onRollback={(id) => fireAndForget(ai.rollback(id))}
              onRate={(id, rating) => fireAndForget(ai.rate(id, rating))}
              onSpeak={speak}
            />
            {ai.errorText ? (
              <Text
                color="$danger"
                fontSize={13}
                paddingHorizontal={12}
                paddingBottom={6}
                role="alert"
                onPress={ai.clearError}
              >
                {t(ai.errorText)}
              </Text>
            ) : null}
            {!streaming && (
              <AskSuggestionBubbles
                suggestions={
                  thread.messages.length ? bootstrap.suggestions.slice(0, 3) : bootstrap.suggestions
                }
                disabled={ai.sending}
                onPick={send}
              />
            )}
            <AskComposer
              streaming={streaming}
              sending={ai.sending}
              maxChars={bootstrap.limits.max_input_chars}
              maxAttachments={features.uploads ? bootstrap.limits.max_attachments : 0}
              voiceEnabled={features.voice}
              recording={voice.recording}
              transcribing={voice.transcribing}
              onSend={send}
              onStop={ai.stop}
              onRecordStart={voice.start}
              onRecordStop={voice.stop}
            />
          </>
        ) : (
          <Text testID="ask-duncit-unavailable" padding={24} color="$muted" textAlign="center">
            {t(unavailableKey(bootstrap.unavailable_reason))}
          </Text>
        )}
        <AskHistorySheet
          open={historyOpen}
          activeId={thread.conversationId}
          showMemory={features.memory}
          onClose={() => setHistoryOpen(false)}
          onOpenConversation={(id) => {
            setHistoryOpen(false);
            openConversation(id);
          }}
          onDeletedActive={() => openConversation(null)}
        />
        <AskHandoverSheet
          open={handoverOpen}
          busy={ai.handingOver}
          onClose={() => setHandoverOpen(false)}
          onSubmit={ai.handover}
        />
      </YStack>
    </KeyboardAvoidingView>
  );
}
