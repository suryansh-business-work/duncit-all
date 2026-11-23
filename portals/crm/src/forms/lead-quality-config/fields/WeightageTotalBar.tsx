import { useId } from 'react';
import { Alert, LinearProgress, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { QUALITY_MAX_SCORE } from '../../../lib/generated/lead-quality-rules';
import { issueMessage, issuesAt } from '../lead-quality-config.issues';
import { useLiveIssues } from './LiveIssues';

type BarState = 'over' | 'under' | 'valid' | 'unreadable';

const SEVERITY = { over: 'error', under: 'warning', valid: 'success', unreadable: 'info' } as const;

/**
 * The enabled criteria's weightage against 100%, live. Over 100 can never be
 * saved, under 100 can be saved as a draft but not published, exactly 100 is
 * ready. While a weightage is not a readable number the rules do not total the
 * model, so the bar says so instead of guessing.
 */
export default function WeightageTotalBar() {
  const { t } = useTranslation();
  const labelId = useId();
  const { issues, total } = useLiveIssues();
  const totalIssue = issuesAt(issues, 'criteria').find((issue) => issue.code === 'TOTAL_OVER' || issue.code === 'TOTAL_UNDER');
  const unreadable = issues.some((issue) => issue.path.startsWith('criteria.') && issue.path.endsWith('.weightage'));

  let state: BarState = 'valid';
  let message = t('crm.leadQualitySettings.totalValid');
  if (totalIssue) {
    state = totalIssue.code === 'TOTAL_OVER' ? 'over' : 'under';
    message = issueMessage(t, totalIssue);
  } else if (unreadable) {
    state = 'unreadable';
    message = t('crm.leadQualitySettings.totalUnreadable');
  }
  const severity = SEVERITY[state];

  return (
    <Stack spacing={1} data-testid="lead-quality-total" data-state={state}>
      <Typography id={labelId} variant="subtitle2" sx={{ fontWeight: 700 }}>
        {t('crm.leadQualitySettings.totalLabel', { vars: { total } })}
      </Typography>
      <LinearProgress
        variant="determinate"
        value={Math.min(total, QUALITY_MAX_SCORE)}
        color={severity === 'info' ? 'primary' : severity}
        aria-labelledby={labelId}
      />
      <Alert severity={severity} role="status" data-testid="lead-quality-total-message">
        {message}
      </Alert>
    </Stack>
  );
}
