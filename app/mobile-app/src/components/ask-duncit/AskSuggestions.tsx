import { Text, XStack, YStack } from 'tamagui';
import { alertText, suggestionText } from '@duncit/utils';

import { ChoiceChip } from '@/components/brand-orders/ChoiceChip';
import { DuncitButton } from '@/components/DuncitButton';
import { useTranslation } from '@/hooks/useTranslation';
import type { AskDuncitBootstrap } from '@/hooks/useAskDuncit';

type Bootstrap = NonNullable<AskDuncitBootstrap>;

/** Suggestion bubbles — the twin of mWeb's SuggestionBubbles. */
export function AskSuggestionBubbles({
  suggestions,
  disabled,
  onPick,
}: Readonly<{
  suggestions: Bootstrap['suggestions'];
  disabled: boolean;
  onPick: (text: string) => void;
}>) {
  const { t } = useTranslation();
  if (!suggestions.length) return null;
  return (
    <XStack
      flexWrap="wrap"
      gap={8}
      paddingHorizontal={12}
      paddingBottom={8}
      role="list"
      aria-label={t('askDuncit.suggestionsLabel')}
    >
      {suggestions.map((s) => {
        const text = suggestionText(s, t);
        return (
          <ChoiceChip
            key={s.id}
            testID={`ask-duncit-suggestion-${s.id}`}
            label={text}
            active={false}
            onPress={disabled ? () => undefined : () => onPick(text)}
          />
        );
      })}
    </XStack>
  );
}

const TONE = { CRITICAL: '$danger', WARN: '$warning', INFO: '$info' } as const;

/** Proactive alerts — the twin of mWeb's AlertsBar. */
export function AskAlertsBar({
  alerts,
  onAsk,
}: Readonly<{ alerts: Bootstrap['alerts']; onAsk: (text: string) => void }>) {
  const { t } = useTranslation();
  if (!alerts.length) return null;
  return (
    <YStack gap={6} paddingHorizontal={12} paddingTop={8}>
      {alerts.map((alert) => (
        <XStack
          key={alert.id}
          alignItems="center"
          gap={8}
          borderWidth={1}
          borderColor={TONE[alert.severity as keyof typeof TONE] ?? '$info'}
          borderRadius={12}
          padding={10}
          role="alert"
        >
          <Text flex={1} fontSize={13} color="$color">
            {alertText(alert, t)}
          </Text>
          <DuncitButton
            size="sm"
            variant="soft"
            tone="neutral"
            label={t('askDuncit.alerts.ask')}
            onPress={() => onAsk(t(alert.prompt_key))}
          />
        </XStack>
      ))}
    </YStack>
  );
}

/** The empty conversation — the twin of mWeb's EmptyState. */
export function AskEmptyState() {
  const { t } = useTranslation();
  return (
    <YStack alignItems="center" gap={8} paddingVertical={48} paddingHorizontal={24}>
      <Text fontSize={18} fontWeight="700" color="$color" textAlign="center">
        {t('askDuncit.empty.title')}
      </Text>
      <Text fontSize={14} color="$muted" textAlign="center">
        {t('askDuncit.empty.body')}
      </Text>
      <Text testID="ask-duncit-beta-hint" fontSize={12} color="$muted" textAlign="center">
        {t('askDuncit.betaHint')}
      </Text>
    </YStack>
  );
}
