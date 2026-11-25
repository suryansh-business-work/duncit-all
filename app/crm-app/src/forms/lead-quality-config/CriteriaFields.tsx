import { MaterialIcons } from '@expo/vector-icons';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { XStack, YStack, useTheme } from 'tamagui';
import { leadQualityIssuesAt } from '@duncit/forms/schemas';

import { DuncitButton } from '@/components/DuncitButton';
import {
  LEAD_QUALITY_EDITOR,
  type QualityFormValues,
} from '@/features/lead-quality-settings/editor';
import { QUALITY_LIMITS } from '@/generated/lead-quality-rules';
import { useTranslation } from '@/hooks/useTranslation';
import { CriterionCard } from './CriterionCard';
import { useLiveIssues } from './LiveIssues';
import { SectionHeading } from './SectionHeading';
import { WeightageTotalBar } from './WeightageTotalBar';

/** The total bar reports these two; the list reports the rest (none enabled, too many). */
const TOTAL_CODES = new Set(['TOTAL_OVER', 'TOTAL_UNDER']);

/** The criteria builder: the live total, each criterion in scoring order, and Add criterion. */
export function CriteriaFields() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { control } = useFormContext<QualityFormValues>();
  const { fields, append, remove, move } = useFieldArray({ control, name: 'criteria' });
  const { issues } = useLiveIssues();
  return (
    <YStack gap="$3">
      <SectionHeading
        title={t('crm.leadQualitySettings.criteriaTitle')}
        hint={t('crm.leadQualitySettings.criteriaHint')}
        issues={leadQualityIssuesAt(issues, 'criteria').filter(
          (issue) => !TOTAL_CODES.has(issue.code),
        )}
        testID="lead-quality-criteria"
      />
      <WeightageTotalBar />
      {fields.map((field, index) => (
        <CriterionCard
          key={field.id}
          index={index}
          count={fields.length}
          onMove={move}
          onRemove={remove}
        />
      ))}
      <XStack>
        <DuncitButton
          label={t('crm.leadQualitySettings.addCriterion')}
          onPress={() => append(LEAD_QUALITY_EDITOR.blankCriterion())}
          disabled={fields.length >= QUALITY_LIMITS.criteria}
          variant="outline"
          icon={<MaterialIcons name="add" size={20} color={theme.accentText?.val} />}
          testID="lead-quality-add-criterion"
        />
      </XStack>
    </YStack>
  );
}
