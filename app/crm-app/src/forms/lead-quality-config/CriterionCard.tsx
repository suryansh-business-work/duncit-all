import { useFormContext, useWatch } from 'react-hook-form';
import { XStack, YStack } from 'tamagui';

import { ToggleField } from '@/components/settings-editors/ToggleField';
import { SURFACE } from '@/components/surface';
import { TextField } from '@/components/TextField';
import type { QualityFormValues } from '@/features/lead-quality-settings/editor';
import { useTranslation } from '@/hooks/useTranslation';
import { CheckFields } from './CheckFields';
import { RowControls } from './RowControls';
import { SubCriteriaFields } from './SubCriteriaFields';

interface Props {
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
}

/**
 * One criterion: name, weightage, on/off, mandatory gate, guidance and its
 * sub-criteria. A criterion with sub-criteria is checked through them, so its
 * own check is offered only while it has none (or still holds one to clear).
 */
export function CriterionCard({ index, count, onMove, onRemove }: Readonly<Props>) {
  const { t } = useTranslation();
  const { control } = useFormContext<QualityFormValues>();
  const base = `criteria.${index}` as const;
  const [name, autoCheck, subs] = useWatch({
    control,
    name: [`${base}.name`, `${base}.auto_check`, `${base}.sub_criteria`],
  });
  const label = name.trim() || t('crm.leadQualitySettings.untitled');
  const testID = `lead-quality-criterion-${index}`;
  return (
    <YStack
      {...SURFACE}
      gap="$3"
      role="group"
      aria-label={t('crm.leadQualitySettings.criterionAria', {
        vars: { number: index + 1, name: label },
      })}
      testID={testID}
    >
      <XStack gap="$2" alignItems="flex-start">
        <YStack flex={1} gap="$2">
          <TextField
            control={control}
            name={`${base}.name`}
            label={t('crm.leadQualitySettings.criterionName')}
            testID={`${testID}-name`}
          />
          <TextField
            control={control}
            name={`${base}.weightage`}
            label={t('crm.leadQualitySettings.weightage')}
            testID={`${testID}-weightage`}
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
        name={`${base}.enabled`}
        label={t('crm.leadQualitySettings.enabled')}
        hint={t('crm.leadQualitySettings.enabledHint')}
        testID={`${testID}-enabled`}
      />
      <ToggleField
        control={control}
        name={`${base}.mandatory`}
        label={t('crm.leadQualitySettings.mandatory')}
        hint={t('crm.leadQualitySettings.mandatoryCriterionHint')}
        testID={`${testID}-mandatory`}
      />
      {subs.length === 0 || autoCheck !== 'NONE' ? (
        <CheckFields base={base} testID={testID} />
      ) : null}
      <TextField
        control={control}
        name={`${base}.guidance`}
        label={t('crm.leadQualitySettings.guidance')}
        hint={t('crm.leadQualitySettings.guidanceHint')}
        multiline
        testID={`${testID}-guidance`}
      />
      <SubCriteriaFields criterionIndex={index} />
    </YStack>
  );
}
