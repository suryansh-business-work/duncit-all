import { Text, YStack } from 'tamagui';
import { leadQualityIssueMessage, leadQualityIssuesAt } from '@duncit/forms/schemas';

import { StatusBox, type StatusTone } from '@/components/settings-editors/StatusBox';
import { RADII } from '@/constants/design';
import { QUALITY_MAX_SCORE } from '@/generated/lead-quality-rules';
import { useTranslation } from '@/hooks/useTranslation';
import { useLiveIssues } from './LiveIssues';

type BarState = 'over' | 'under' | 'valid' | 'unreadable';

const TONE: Record<BarState, StatusTone> = {
  over: 'danger',
  under: 'warning',
  valid: 'success',
  unreadable: 'info',
};
const FILL = {
  over: '$danger',
  under: '$warning',
  valid: '$success',
  unreadable: '$primary',
} as const;

/**
 * The enabled criteria's weightage against 100%, live. Over 100 can never be
 * saved, under 100 can be saved as a draft but not published, exactly 100 is
 * ready. While a weightage is not a readable number the rules do not total the
 * model, so the bar says so instead of guessing.
 */
export function WeightageTotalBar() {
  const { t } = useTranslation();
  const { issues, total } = useLiveIssues();
  const totalIssue = leadQualityIssuesAt(issues, 'criteria').find(
    (issue) => issue.code === 'TOTAL_OVER' || issue.code === 'TOTAL_UNDER',
  );
  const unreadable = issues.some(
    (issue) => issue.path.startsWith('criteria.') && issue.path.endsWith('.weightage'),
  );

  let state: BarState = 'valid';
  let message = t('crm.leadQualitySettings.totalValid');
  if (totalIssue) {
    state = totalIssue.code === 'TOTAL_OVER' ? 'over' : 'under';
    message = leadQualityIssueMessage(t, totalIssue);
  } else if (unreadable) {
    state = 'unreadable';
    message = t('crm.leadQualitySettings.totalUnreadable');
  }
  const label = t('crm.leadQualitySettings.totalLabel', { vars: { total } });

  return (
    <YStack gap="$2" testID="lead-quality-total">
      <Text fontWeight="700">{label}</Text>
      <YStack
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={QUALITY_MAX_SCORE}
        aria-valuenow={Math.min(total, QUALITY_MAX_SCORE)}
        height={8}
        borderRadius={RADII.pill}
        backgroundColor="$soft"
        overflow="hidden"
      >
        <YStack
          height="100%"
          width={`${Math.min(total, QUALITY_MAX_SCORE)}%`}
          backgroundColor={FILL[state]}
        />
      </YStack>
      <StatusBox tone={TONE[state]} message={message} testID={`lead-quality-total-${state}`} />
    </YStack>
  );
}
