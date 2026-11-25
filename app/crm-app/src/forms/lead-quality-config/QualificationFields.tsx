import { useFormContext, useWatch } from 'react-hook-form';
import { YStack } from 'tamagui';

import { ToggleField } from '@/components/settings-editors/ToggleField';
import { TextField } from '@/components/TextField';
import type { QualityFormValues } from '@/features/lead-quality-settings/editor';
import { useTranslation } from '@/hooks/useTranslation';
import { SectionHeading } from './SectionHeading';

/** When a lead qualifies: on its mandatory gates alone, or on the gates plus a minimum score. */
export function QualificationFields() {
  const { t } = useTranslation();
  const { control } = useFormContext<QualityFormValues>();
  const gatesOnly = useWatch({ control, name: 'qualify_on_gates' });
  return (
    <YStack gap="$3">
      <SectionHeading
        title={t('crm.leadQualitySettings.qualificationTitle')}
        testID="lead-quality-qualification"
      />
      <ToggleField
        control={control}
        name="qualify_on_gates"
        label={t('crm.leadQualitySettings.gatesOnly')}
        hint={t('crm.leadQualitySettings.gatesOnlyHint')}
        testID="lead-quality-gates-only"
      />
      {gatesOnly ? null : (
        <TextField
          control={control}
          name="min_qualification_score"
          label={t('crm.leadQualitySettings.minScore')}
          hint={t('crm.leadQualitySettings.minScoreHint')}
          testID="lead-quality-min-score"
        />
      )}
    </YStack>
  );
}
