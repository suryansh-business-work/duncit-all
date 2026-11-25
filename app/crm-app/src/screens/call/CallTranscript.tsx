import { useMemo, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, Text, XStack, YStack, useTheme } from 'tamagui';
import { crmFilterSegments } from '@duncit/utils';

import { ToneChip } from '@/components/ToneChip';
import type { TranscriptLine } from '@/features/calls/callLine';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  segments: TranscriptLine[];
  /** Live transcription is on in the Tech portal. */
  enabled: boolean;
}

/**
 * The call as it is spoken — who said it (you or the contact) and what, with
 * a search box. New lines are announced politely, as on the portal.
 */
export function CallTranscript({ segments, enabled }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const shown = useMemo(() => crmFilterSegments(segments, query), [segments, query]);

  let empty: string | null = null;
  if (!enabled && segments.length === 0) empty = t('crm.call.transcriptOff');
  else if (segments.length === 0) empty = t('crm.call.transcriptEmpty');
  else if (shown.length === 0)
    empty = t('crm.call.transcriptNoMatch', { vars: { query: query.trim() } });

  return (
    <YStack gap="$2">
      <XStack alignItems="center" gap="$2">
        <MaterialIcons
          name="subtitles"
          size={18}
          color={theme.accentText?.val}
          accessibilityElementsHidden
        />
        <Text fontWeight="700" role="heading">
          {t('crm.call.transcriptTitle')}
        </Text>
      </XStack>
      {segments.length > 0 ? (
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder={t('crm.call.transcriptSearch')}
          aria-label={t('crm.call.transcriptSearch')}
          placeholderTextColor="$muted"
          borderColor="$inputBorder"
          testID="transcript-search"
        />
      ) : null}
      <YStack gap="$2" aria-live="polite" testID="call-transcript">
        {empty ? (
          <Text color="$muted">{empty}</Text>
        ) : (
          shown.map((line) => (
            <YStack key={`${line.speaker}-${line.seq}`} gap="$1">
              <XStack>
                <ToneChip
                  label={
                    line.speaker === 'AGENT'
                      ? t('crm.call.speakerAgent')
                      : t('crm.call.speakerLead')
                  }
                  tone={line.speaker === 'AGENT' ? 'info' : 'default'}
                />
              </XStack>
              <Text>{line.text}</Text>
            </YStack>
          ))
        )}
      </YStack>
    </YStack>
  );
}
