import { Box, LinearProgress, Stack, Typography } from '@mui/material';
import { SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import type { EmployeeTargetRecord } from '@duncit/utils';

type Submission = NonNullable<EmployeeTargetRecord['submission']>;

/** The report as it was reviewed — read-only, because the month is closed. */
export default function TargetReportView({ submission }: Readonly<{ submission: Submission }>) {
  const { t } = useTranslation();
  const label = t('employeeTargets.submission.percent', { vars: { percent: submission.completion_percent } });
  return (
    <SectionCard title={t('employeeTargets.submission.title')}>
      <Stack spacing={2} data-testid="my-target-report">
        <Box>
          <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" id="my-target-completion-label">
              {t('employeeTargets.submission.completion')}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {label}
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={submission.completion_percent}
            aria-labelledby="my-target-completion-label"
            aria-valuetext={label}
          />
        </Box>
        <Box>
          <Typography variant="subtitle2" component="h3">
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
          <Typography variant="subtitle2" component="h3">
            {t('employeeTargets.submission.updates')}
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
            {submission.updates || t('employeeTargets.submission.noUpdates')}
          </Typography>
        </Box>
      </Stack>
    </SectionCard>
  );
}
