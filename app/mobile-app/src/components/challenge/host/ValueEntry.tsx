import { useState } from 'react';
import { XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { LabeledInput } from '@/components/LabeledInput';
import type { HostChallengeActions } from '@/hooks/useHostChallengeActions';
import type { PodChallengeView } from '@/hooks/usePodChallengeLive';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';

type Tool = PodChallengeView['tools'][number];

/** A measurement, time or rank typed for one competitor. */
export function ValueEntry({
  tool,
  competitorId,
  actions,
}: Readonly<{ tool: Tool; competitorId: string; actions: HostChallengeActions }>) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const value = Number(text);
  const valid = text.trim() !== '' && Number.isFinite(value) && value >= 0;
  return (
    <XStack gap={8} alignItems="flex-end">
      <YStack flex={1}>
        <LabeledInput
          label={tool.label}
          value={text}
          onChangeText={setText}
          keyboardType="decimal-pad"
          testID={`challenge-value-${tool.instance_id}-${competitorId}`}
        />
      </YStack>
      <DuncitButton
        size="sm"
        variant="outline"
        disabled={actions.busy || !valid}
        label={t('mweb.challenge.record')}
        onPress={() => {
          fireAndForget(actions.score(tool.instance_id, competitorId, value));
          setText('');
        }}
        testID={`challenge-record-${tool.instance_id}-${competitorId}`}
      />
    </XStack>
  );
}
