import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack, useTheme } from 'tamagui';
import { CRM_LEAD_AI_SOURCE_LABEL, crmLeadAiKb } from '@duncit/utils';

import { SURFACE } from '@/components/surface';
import { ToneChip } from '@/components/ToneChip';
import { useTranslation } from '@/hooks/useTranslation';
import type { AskAiContext } from './AskAiState';

/**
 * What the assistant read before answering: every source with its record
 * count and token estimate, plus the total. One line until opened, so the
 * conversation keeps the room.
 */
export function AskAiContextPanel({
  context,
  loading,
}: Readonly<{ context: AskAiContext | null; loading: boolean }>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  if (loading && !context) {
    return (
      <XStack gap="$2" alignItems="center" role="status">
        <Spinner size="small" color="$accentText" />
        <Text color="$muted">{t('crm.askAi.buildingContext')}</Text>
      </XStack>
    );
  }
  if (!context) return null;
  const used = context.sources.filter((s) => s.chars > 0);
  const summary = t('crm.askAi.contextSummary', {
    vars: {
      tokens: context.total_tokens.toLocaleString(),
      size: crmLeadAiKb(context.total_chars),
      sources: used.length,
    },
  });
  return (
    <YStack {...SURFACE} gap="$2" testID="crm-ask-ai-context">
      <XStack
        role="button"
        aria-expanded={open}
        onPress={() => setOpen((v) => !v)}
        alignItems="center"
        gap="$2"
      >
        <MaterialIcons
          name="memory"
          size={20}
          color={theme.accentText?.val}
          accessibilityElementsHidden
        />
        <YStack flex={1}>
          <Text fontWeight="700" fontSize="$2">
            {t('crm.askAi.contextTitle')}
          </Text>
          <Text color="$muted" fontSize="$2">
            {summary}
          </Text>
        </YStack>
        <MaterialIcons
          name={open ? 'expand-less' : 'expand-more'}
          size={22}
          color={theme.color?.val}
          accessibilityElementsHidden
        />
      </XStack>
      {open
        ? context.sources.map((s) => {
            const labelKey = CRM_LEAD_AI_SOURCE_LABEL[s.key];
            return (
              <XStack
                key={s.key}
                gap="$2"
                alignItems="center"
                testID={`crm-ask-ai-source-${s.key}`}
              >
                <Text flex={1} fontSize="$2" color={s.chars > 0 ? '$color' : '$muted'}>
                  {labelKey ? t(labelKey) : s.key}
                </Text>
                <Text color="$muted" fontSize="$2">
                  {t('crm.askAi.sourceStats', {
                    vars: { items: s.items, tokens: s.tokens.toLocaleString() },
                  })}
                </Text>
                {s.truncated ? <ToneChip label={t('crm.askAi.trimmed')} tone="warning" /> : null}
              </XStack>
            );
          })
        : null}
    </YStack>
  );
}
