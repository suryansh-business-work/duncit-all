import { useFormContext, useWatch } from 'react-hook-form';
import { YStack } from 'tamagui';
import { CRM_AUTO_CHECK_KEY, CRM_QUALITY_THRESHOLD_HINT_KEY, crmKeyOr } from '@duncit/utils';

import { ChoiceField } from '@/components/ChoiceField';
import { TextField } from '@/components/TextField';
import type { QualityFormValues } from '@/features/lead-quality-settings/editor';
import { AUTO_CHECKS, THRESHOLD_CHECKS } from '@/generated/lead-quality-rules';
import { useTranslation } from '@/hooks/useTranslation';

/** A criterion, or one of its sub-criteria — the two places a check can be set. */
export type ItemBase = `criteria.${number}` | `criteria.${number}.sub_criteria.${number}`;

/**
 * The automatic check of one item and, only for the follower, recent-post and
 * review checks, the number it compares against. Any other check keeps no
 * threshold, so the field is not shown for it.
 */
export function CheckFields({ base, testID }: Readonly<{ base: ItemBase; testID: string }>) {
  const { t } = useTranslation();
  const { control } = useFormContext<QualityFormValues>();
  const check = useWatch({ control, name: `${base}.auto_check` });
  const hintKey = CRM_QUALITY_THRESHOLD_HINT_KEY[check];
  return (
    <YStack gap="$2">
      <ChoiceField
        control={control}
        name={`${base}.auto_check`}
        label={t('crm.leadQualitySettings.autoCheck')}
        options={AUTO_CHECKS.map((value) => ({
          value,
          label: t(crmKeyOr(CRM_AUTO_CHECK_KEY, value, 'crm.leadQuality.autoNone')),
        }))}
        testID={`${testID}-check`}
      />
      {THRESHOLD_CHECKS.includes(check) ? (
        <TextField
          control={control}
          name={`${base}.threshold`}
          label={t('crm.leadQualitySettings.threshold')}
          hint={hintKey ? t(hintKey) : undefined}
          keyboardType="number-pad"
          testID={`${testID}-threshold`}
        />
      ) : null}
    </YStack>
  );
}
