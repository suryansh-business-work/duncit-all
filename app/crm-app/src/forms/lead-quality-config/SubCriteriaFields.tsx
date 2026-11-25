import { MaterialIcons } from '@expo/vector-icons';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Text, XStack, YStack, useTheme } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import {
  LEAD_QUALITY_EDITOR,
  type QualityFormValues,
} from '@/features/lead-quality-settings/editor';
import { QUALITY_LIMITS } from '@/generated/lead-quality-rules';
import { useTranslation } from '@/hooks/useTranslation';
import { SubCriterionRow } from './SubCriterionRow';
import { SubTotalFeedback } from './SubTotalFeedback';

/** A criterion's sub-criteria: each earns points out of the criterion's weightage. */
export function SubCriteriaFields({ criterionIndex }: Readonly<{ criterionIndex: number }>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { control } = useFormContext<QualityFormValues>();
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: `criteria.${criterionIndex}.sub_criteria`,
  });
  const title = t('crm.leadQualitySettings.subCriteriaTitle');
  return (
    <YStack gap="$2" role="group" aria-label={title}>
      <Text fontWeight="700" role="heading">
        {title}
      </Text>
      <SubTotalFeedback index={criterionIndex} />
      {fields.length === 0 ? (
        <Text color="$muted" fontSize="$2">
          {t('crm.leadQualitySettings.noSubCriteria')}
        </Text>
      ) : null}
      {fields.map((field, index) => (
        <SubCriterionRow
          key={field.id}
          criterionIndex={criterionIndex}
          index={index}
          count={fields.length}
          onMove={move}
          onRemove={remove}
        />
      ))}
      <XStack>
        <DuncitButton
          label={t('crm.leadQualitySettings.addSubCriterion')}
          onPress={() => append(LEAD_QUALITY_EDITOR.blankSubCriterion())}
          disabled={fields.length >= QUALITY_LIMITS.subCriteria}
          variant="ghost"
          size="sm"
          icon={<MaterialIcons name="add" size={18} color={theme.accentText?.val} />}
          testID={`lead-quality-add-sub-${criterionIndex}`}
        />
      </XStack>
    </YStack>
  );
}
