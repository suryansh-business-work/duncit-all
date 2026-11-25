import { useWatch, type Control } from 'react-hook-form';
import { Text, YStack } from 'tamagui';

import { ChoiceField } from '@/components/ChoiceField';
import { TextField } from '@/components/TextField';
import { RADII } from '@/constants/design';
import { useTranslation } from '@/hooks/useTranslation';
import type { LeadEvidenceValues } from './lead-evidence.types';

/**
 * Lead Quality Score → record one item's evidence, as the portal's dialog:
 * Verified (earns the points), Not met, or clear the decision. Clearing hides
 * the text fields, so a half-typed one never blocks it.
 */
export function LeadEvidenceFields({
  control,
}: Readonly<{ control: Control<LeadEvidenceValues> }>) {
  const { t } = useTranslation();
  const status = useWatch({ control, name: 'status' });
  const verified = status === 'VERIFIED';
  return (
    <YStack gap="$3">
      <ChoiceField
        control={control}
        name="status"
        label={t('crm.leadQualityTab.decision')}
        options={[
          { value: 'VERIFIED', label: t('crm.leadQualityTab.decisionVerified') },
          { value: 'FAILED', label: t('crm.leadQualityTab.decisionFailed') },
          { value: 'PENDING', label: t('crm.leadQualityTab.decisionClear') },
        ]}
        testID="evidence-status"
      />
      {status === 'PENDING' ? (
        <YStack
          backgroundColor="$infoSoft"
          borderRadius={RADII.sm}
          padding="$3"
          testID="evidence-clear-hint"
        >
          <Text>{t('crm.leadQualityTab.clearHint')}</Text>
        </YStack>
      ) : (
        <>
          <TextField
            control={control}
            name="evidence"
            label={verified ? t('crm.leadQualityTab.evidence') : t('crm.leadQualityTab.reason')}
            hint={
              verified ? t('crm.leadQualityTab.evidenceHint') : t('crm.leadQualityTab.reasonHint')
            }
            multiline
            testID="evidence-text"
          />
          <TextField
            control={control}
            name="source_url"
            label={t('crm.leadQualityTab.sourceLink')}
            hint={t('crm.leadQualityTab.sourceHint')}
            testID="evidence-source"
          />
          <TextField
            control={control}
            name="notes"
            label={t('crm.leadQualityTab.notes')}
            hint={t('crm.leadQualityTab.notesHint')}
            multiline
            testID="evidence-notes"
          />
        </>
      )}
    </YStack>
  );
}
