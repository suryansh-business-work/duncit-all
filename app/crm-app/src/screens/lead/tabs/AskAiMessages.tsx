import type { ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack, useTheme } from 'tamagui';
import { CRM_LEAD_AI_SUGGESTIONS } from '@duncit/utils';

import { SURFACE } from '@/components/surface';
import { RADII } from '@/constants/design';
import { useTranslation } from '@/hooks/useTranslation';
import type { AskAiMessage } from './AskAiState';
import { htmlToText } from './ManualLogsHtml';

interface Props {
  messages: readonly AskAiMessage[];
  /** The question on its way, shown until the saved pair comes back. */
  pending: string | null;
  /** The saved thread has loaded: until then there is nothing to start from (and a question asked now would be overwritten). */
  ready: boolean;
  onSuggestion: (text: string) => void;
  /** The proposals under one assistant message. */
  renderActions: (message: AskAiMessage) => ReactNode;
}

function Bubble({ user, children }: Readonly<{ user: boolean; children: ReactNode }>) {
  const theme = useTheme();
  return (
    <XStack gap="$2" alignItems="flex-start" flexDirection={user ? 'row-reverse' : 'row'}>
      <MaterialIcons
        name={user ? 'person' : 'smart-toy'}
        size={22}
        color={user ? theme.accentText?.val : theme.info?.val}
        accessibilityElementsHidden
      />
      <YStack gap="$2" maxWidth="85%" flexShrink={1}>
        {children}
      </YStack>
    </XStack>
  );
}

function UserText({ text }: Readonly<{ text: string }>) {
  return (
    <YStack
      backgroundColor="$primary"
      borderRadius={RADII.lg}
      paddingHorizontal="$3"
      paddingVertical="$2"
    >
      <Text color="$onPrimary">{text}</Text>
    </YStack>
  );
}

/** The conversation: starter questions while it is empty, then each turn with its proposals. */
export function AskAiMessages({
  messages,
  pending,
  ready,
  onSuggestion,
  renderActions,
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <YStack gap="$3" role="log" aria-live="polite">
      {ready && messages.length === 0 && !pending ? (
        <YStack gap="$2">
          <Text color="$muted">{t('crm.components.askAnythingAboutThisLeadTry')}</Text>
          {CRM_LEAD_AI_SUGGESTIONS.map((key) => (
            <YStack
              key={key}
              {...SURFACE}
              role="button"
              onPress={() => onSuggestion(t(key))}
              testID="crm-ask-ai-suggestion"
            >
              <Text>{t(key)}</Text>
            </YStack>
          ))}
        </YStack>
      ) : null}
      {messages.map((m) => (
        <Bubble key={m.id} user={m.role === 'user'}>
          {m.role === 'user' ? (
            <UserText text={m.content} />
          ) : (
            <>
              <YStack {...SURFACE}>
                <Text selectable>{htmlToText(m.content)}</Text>
              </YStack>
              {renderActions(m)}
            </>
          )}
        </Bubble>
      ))}
      {pending ? (
        <>
          <Bubble user>
            <UserText text={pending} />
          </Bubble>
          <XStack gap="$2" alignItems="center" role="status">
            <Spinner size="small" color="$accentText" />
            <Text color="$muted">{t('crm.askAi.thinking')}</Text>
          </XStack>
        </>
      ) : null}
    </YStack>
  );
}
