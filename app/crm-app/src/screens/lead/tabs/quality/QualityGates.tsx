import { Text, XStack, YStack } from 'tamagui';
import { CRM_GATE_KEY, CRM_GATE_TONE, crmKeyOr } from '@duncit/utils';

import { ToneChip } from '@/components/ToneChip';
import { useTranslation } from '@/hooks/useTranslation';
import type { QualityResult } from './useLeadQuality';

/** The mandatory gates a lead must pass to qualify, each Passed / Failed / To verify. */
export function QualityGates({ gates }: Readonly<{ gates: QualityResult['gates'] }>) {
  const { t } = useTranslation();
  return (
    <YStack gap="$2">
      <Text fontWeight="700" role="heading">
        {t('crm.leadQualityTab.gatesTitle')}
      </Text>
      {gates.length === 0 ? <Text color="$muted">{t('crm.leadQualityTab.noGates')}</Text> : null}
      <XStack gap="$2" flexWrap="wrap" role="list">
        {gates.map((gate) => (
          <ToneChip
            key={gate.key}
            label={t('crm.leadQualityTab.gateChip', {
              vars: {
                name: gate.name,
                state: t(crmKeyOr(CRM_GATE_KEY, gate.state, 'crm.leadQuality.gatePending')),
              },
            })}
            tone={CRM_GATE_TONE[gate.state] ?? 'default'}
            testID={`lead-quality-gate-${gate.key}`}
          />
        ))}
      </XStack>
    </YStack>
  );
}
