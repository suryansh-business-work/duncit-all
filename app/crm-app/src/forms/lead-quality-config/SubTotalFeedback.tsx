import { Text, YStack } from 'tamagui';
import {
  leadQualityHasIssueWithin,
  leadQualityIssueMessage,
  leadQualityIssuesAt,
  leadQualityNumber,
} from '@duncit/forms/schemas';

import { StatusBox, type StatusTone } from '@/components/settings-editors/StatusBox';
import { toHundredths } from '@/generated/lead-quality-rules';
import { useTranslation } from '@/hooks/useTranslation';
import { useLiveIssues } from './LiveIssues';

/** `toHundredths` works in hundredths of a point. */
const HUNDREDTHS_PER_POINT = 100;

/**
 * One criterion's sub-criteria points against its weightage. Over is refused
 * even in a draft; short is refused only at publish; equal is ready. While a
 * points value or the weightage has its own problem, only the running total
 * is shown.
 */
export function SubTotalFeedback({ index }: Readonly<{ index: number }>) {
  const { t } = useTranslation();
  const { values, issues } = useLiveIssues();
  const criterion = values.criteria[index];
  if (!criterion || criterion.sub_criteria.length === 0) return null;

  const listPath = `criteria.${index}.sub_criteria`;
  const sumIssue = leadQualityIssuesAt(issues, listPath).find(
    (issue) => issue.code === 'SUB_SUM_OVER' || issue.code === 'SUB_SUM_MISMATCH',
  );
  const points = criterion.sub_criteria.reduce(
    (sum, sub) => sum + (toHundredths(leadQualityNumber(sub.points)) ?? 0),
    0,
  );
  const settled =
    !leadQualityHasIssueWithin(issues, listPath) &&
    !leadQualityHasIssueWithin(issues, `criteria.${index}.weightage`);

  let tone: StatusTone | null = null;
  let message = '';
  if (sumIssue) {
    tone = sumIssue.code === 'SUB_SUM_OVER' ? 'danger' : 'warning';
    message = leadQualityIssueMessage(t, sumIssue);
  } else if (settled) {
    tone = 'success';
    message = t('crm.leadQualitySettings.subValid');
  }

  return (
    <YStack gap="$1" testID={`lead-quality-sub-total-${index}`}>
      <Text fontWeight="600" fontSize="$3">
        {t('crm.leadQualitySettings.subTotal', {
          vars: { total: points / HUNDREDTHS_PER_POINT, weightage: criterion.weightage },
        })}
      </Text>
      {tone ? <StatusBox tone={tone} message={message} /> : null}
    </YStack>
  );
}
