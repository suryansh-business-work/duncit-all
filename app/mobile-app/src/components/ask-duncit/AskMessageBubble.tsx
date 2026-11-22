import { memo } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';
import { errorKey, toolStatusKey, type AskDuncitMessageView } from '@duncit/utils';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { AskActionCard } from './AskActionCard';
import { AskIconButton } from './AskIconButton';
import { AskMarkdown } from './AskMarkdown';

interface Props {
  message: AskDuncitMessageView;
  canRollback: boolean;
  voice: boolean;
  speaking: boolean;
  onDecide: (actionId: string, approve: boolean) => void;
  onRollback: (actionId: string) => void;
  onRate: (messageId: string, rating: 'UP' | 'DOWN') => void;
  onSpeak: (messageId: string, text: string) => void;
}

const HIDDEN_TOOLS = new Set(['find_tools', 'describe_tool', 'flag_out_of_context']);

function ToolSteps({ calls }: Readonly<{ calls: AskDuncitMessageView['tool_calls'] }>) {
  const { t } = useTranslation();
  const shown = calls.filter((c) => !HIDDEN_TOOLS.has(c.name));
  if (!shown.length) return null;
  return (
    <XStack flexWrap="wrap" gap={4} marginBottom={6}>
      {shown.map((call, i) => (
        <XStack
          key={`${call.name}-${i}`}
          alignItems="center"
          gap={4}
          borderWidth={1}
          borderColor="$borderColor"
          borderRadius={999}
          paddingHorizontal={8}
          paddingVertical={2}
        >
          {call.status === 'RUNNING' && <Spinner size="small" />}
          <Text
            fontSize={11}
            color="$muted"
          >{`${call.title} · ${t(toolStatusKey(call.status))}`}</Text>
        </XStack>
      ))}
    </XStack>
  );
}

/** One message — the twin of mWeb's MessageBubble. */
function AskMessageBubbleInner({
  message,
  canRollback,
  voice,
  speaking,
  onDecide,
  onRollback,
  onRate,
  onSpeak,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { muted, onPrimary } = useThemeColors();
  const mine = message.role === 'user';
  const streaming = message.status === 'STREAMING';
  const done = message.status === 'COMPLETE' || message.status === 'STOPPED';
  const failed = message.status === 'FAILED' || Boolean(message.error_code);
  return (
    <YStack
      alignItems={mine ? 'flex-end' : 'flex-start'}
      gap={6}
      testID={`ask-duncit-message-${message.role}`}
    >
      <YStack
        maxWidth="88%"
        paddingHorizontal={14}
        paddingVertical={10}
        borderRadius={18}
        backgroundColor={mine ? '$primary' : '$background'}
        borderWidth={mine ? 0 : 1}
        borderColor="$borderColor"
      >
        {mine ? (
          <Text fontSize={14} lineHeight={20} color="$onPrimary">
            {message.content}
          </Text>
        ) : (
          <>
            <ToolSteps calls={message.tool_calls} />
            {message.content ? <AskMarkdown text={message.content} /> : null}
            {!message.content && streaming && (
              <XStack gap={8} alignItems="center" aria-live="polite">
                <Spinner size="small" />
                <Text fontSize={14} color="$muted">
                  {t('askDuncit.thinking')}
                </Text>
              </XStack>
            )}
          </>
        )}
        {message.attachments.map((file) => (
          <XStack key={file.url} alignItems="center" gap={4} marginTop={4}>
            <MaterialIcons name="attach-file" size={14} color={mine ? onPrimary : muted} />
            <Text fontSize={12} color={mine ? '$onPrimary' : '$muted'} numberOfLines={1}>
              {file.name}
            </Text>
          </XStack>
        ))}
        {failed && !mine && (
          <Text fontSize={14} color="$danger" role="alert" marginTop={message.content ? 6 : 0}>
            {t(errorKey(message.error_code))}
          </Text>
        )}
        {message.status === 'STOPPED' && (
          <Text fontSize={12} color="$muted" marginTop={4}>
            {t('askDuncit.stopped')}
          </Text>
        )}
      </YStack>
      {message.actions.map((action) => (
        <YStack key={action.id} width="88%">
          <AskActionCard
            action={action}
            canRollback={canRollback}
            onDecide={onDecide}
            onRollback={onRollback}
          />
        </YStack>
      ))}
      {!mine && done && message.content ? (
        <XStack alignItems="center" gap={2}>
          <AskIconButton
            icon="thumb-up-off-alt"
            size={18}
            label={t('askDuncit.feedback.up')}
            active={message.feedback_rating === 'UP'}
            onPress={() => onRate(message.id, 'UP')}
          />
          <AskIconButton
            icon="thumb-down-off-alt"
            size={18}
            label={t('askDuncit.feedback.down')}
            active={message.feedback_rating === 'DOWN'}
            onPress={() => onRate(message.id, 'DOWN')}
          />
          {voice && (
            <AskIconButton
              icon={speaking ? 'stop-circle' : 'volume-up'}
              size={18}
              label={t(speaking ? 'askDuncit.voice.stopReading' : 'askDuncit.voice.readAloud')}
              onPress={() => onSpeak(message.id, message.content)}
            />
          )}
          {message.low_confidence && (
            <Text fontSize={12} color="$warning">
              {t('askDuncit.lowConfidence')}
            </Text>
          )}
        </XStack>
      ) : null}
      {!mine && message.knowledge_refs?.length ? (
        <Text fontSize={12} color="$muted">
          {`${t('askDuncit.sources')}: ${message.knowledge_refs.map((ref) => ref.title).join(' · ')}`}
        </Text>
      ) : null}
    </YStack>
  );
}

export const AskMessageBubble = memo(AskMessageBubbleInner);
