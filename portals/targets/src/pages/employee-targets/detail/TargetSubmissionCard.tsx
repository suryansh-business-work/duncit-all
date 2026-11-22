import { Alert, Box, LinearProgress, Stack, Typography } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import type { EmployeeTargetRecord } from '@duncit/utils';

/**
 * What the employee reported: the completion bar, every achievement row and
 * the free-text updates — or a note that nothing has come in yet.
 */
export default function TargetSubmissionCard({ submission }: Readonly<{ submission: EmployeeTargetRecord['submission'] }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  if (!submission) return <Alert severity="info">{t('employeeTargets.submission.notSubmitted')}</Alert>;
  const percent = submission.completion_percent;
  const label = t('employeeTargets.submission.percent', { vars: { percent } });

  return (
    <Stack spacing={2} data-testid="target-submission">
      <Box>
        <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="body2" id="target-completion-label">
            {t('employeeTargets.submission.completion')}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700 }} data-testid="target-completion">
            {label}
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={percent}
          aria-labelledby="target-completion-label"
          aria-valuetext={label}
        />
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('employeeTargets.submission.submittedAt', {
            vars: { date: formatDateTime(submission.submitted_at), count: submission.submission_count },
          })}
        </Typography>
      </Box>
      <Box>
        <Typography variant="subtitle2" component="h4">
          {t('employeeTargets.submission.achievements')}
        </Typography>
        <Stack component="ul" spacing={1} sx={{ m: 0, pl: 2 }}>
          {submission.achievements.map((achievement, index) => (
            <li key={`${index}-${achievement.title}`}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {achievement.title}
              </Typography>
              {achievement.details && (
                <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-line' }}>
                  {achievement.details}
                </Typography>
              )}
            </li>
          ))}
        </Stack>
      </Box>
      <Box>
        <Typography variant="subtitle2" component="h4">
          {t('employeeTargets.submission.updates')}
        </Typography>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-line', color: submission.updates ? 'text.primary' : 'text.secondary' }}>
          {submission.updates || t('employeeTargets.submission.noUpdates')}
        </Typography>
      </Box>
    </Stack>
  );
}
