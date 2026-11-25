import { useFormContext, useWatch } from 'react-hook-form';
import { XStack, YStack } from 'tamagui';

import { ToggleField } from '@/components/settings-editors/ToggleField';
import { SURFACE } from '@/components/surface';
import { TextField } from '@/components/TextField';
import type { QualityFormValues } from '@/features/lead-quality-settings/editor';
import { useTranslation } from '@/hooks/useTranslation';
import { CheckFields } from './CheckFields';
import { RowControls } from './RowControls';

interface Props {
  criterionIndex: number;
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
}

/** One sub-criterion: what is verified, the points it earns, whether it is a gate, and how it is checked. */
export function SubCriterionRow({
  criterionIndex,
  index,
  count,
  onMove,
  onRemove,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { control } = useFormContext<QualityFormValues>();
  const base = `criteria.${criterionIndex}.sub_criteria.${index}` as const;
  const name = useWatch({ control, name: `${base}.name` });
  const label = name.trim() || t('crm.leadQualitySettings.untitled');
  const testID = `lead-quality-sub-${criterionIndex}-${index}`;
  return (
    <YStack
      {...SURFACE}
      backgroundColor="$background"
      gap="$3"
      role="group"
      aria-label={t('crm.leadQualitySettings.subAria', {
        vars: { number: index + 1, name: label },
      })}
      testID={testID}
    >
      <XStack gap="$2" alignItems="flex-start">
        <YStack flex={1} gap="$2">
          <TextField
            control={control}
            name={`${base}.name`}
            label={t('crm.leadQualitySettings.subName')}
            testID={`${testID}-name`}
          />
          <TextField
            control={control}
            name={`${base}.points`}
            label={t('crm.leadQualitySettings.points')}
            testID={`${testID}-points`}
          />
        </YStack>
        <RowControls
          label={label}
          index={index}
          count={count}
          onMove={onMove}
          onRemove={onRemove}
          testID={testID}
        />
      </XStack>
      <ToggleField
        control={control}
        name={`${base}.mandatory`}
        label={t('crm.leadQualitySettings.mandatory')}
        hint={t('crm.leadQualitySettings.mandatorySubHint')}
        testID={`${testID}-mandatory`}
      />
      <CheckFields base={base} testID={testID} />
      <TextField
        control={control}
        name={`${base}.guidance`}
        label={t('crm.leadQualitySettings.guidance')}
        multiline
        testID={`${testID}-guidance`}
      />
    </YStack>
  );
}
