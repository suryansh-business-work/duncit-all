import { Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import { useTranslation } from '@duncit/shell';
import { toHundredths } from '../../../lib/generated/lead-quality-rules';
import { toNumber } from '../lead-quality-config.convert';
import { hasIssueWithin, issueMessage, issuesAt } from '../lead-quality-config.issues';
import { useLiveIssues } from './LiveIssues';

/** `toHundredths` works in hundredths of a point. */
const HUNDREDTHS_PER_POINT = 100;

const ICON = {
  error: <ErrorIcon fontSize="small" color="error" />,
  warning: <WarningIcon fontSize="small" color="warning" />,
  success: <CheckCircleIcon fontSize="small" color="success" />,
};

/**
 * One criterion's sub-criteria points against its weightage. Over is refused
 * even in a draft; short is refused only at publish; equal is ready. While a
 * points value or the weightage has its own problem, only the running total
 * is shown.
 */
export default function SubTotalFeedback({ index }: Readonly<{ index: number }>) {
  const { t } = useTranslation();
  const { values, issues } = useLiveIssues();
  const criterion = values.criteria[index];
  if (!criterion || criterion.sub_criteria.length === 0) return null;

  const listPath = `criteria.${index}.sub_criteria`;
  const sumIssue = issuesAt(issues, listPath).find((issue) => issue.code === 'SUB_SUM_OVER' || issue.code === 'SUB_SUM_MISMATCH');
  const pointsHundredths = criterion.sub_criteria.reduce((sum, sub) => sum + (toHundredths(toNumber(sub.points)) ?? 0), 0);
  const settled = !hasIssueWithin(issues, listPath) && !hasIssueWithin(issues, `criteria.${index}.weightage`);

  let tone: keyof typeof ICON | null = null;
  let message = '';
  if (sumIssue) {
    tone = sumIssue.code === 'SUB_SUM_OVER' ? 'error' : 'warning';
    message = issueMessage(t, sumIssue);
  } else if (settled) {
    tone = 'success';
    message = t('crm.leadQualitySettings.subValid');
  }

  return (
    <Stack spacing={0.5} role="status" data-testid={`lead-quality-sub-total-${index}`} data-state={tone ?? 'pending'}>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {t('crm.leadQualitySettings.subTotal', { vars: { total: pointsHundredths / HUNDREDTHS_PER_POINT, weightage: criterion.weightage } })}
      </Typography>
      {tone && (
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          {ICON[tone]}
          <Typography variant="body2" sx={{ color: `${tone}.main` }}>
            {message}
          </Typography>
        </Stack>
      )}
    </Stack>
  );
}
