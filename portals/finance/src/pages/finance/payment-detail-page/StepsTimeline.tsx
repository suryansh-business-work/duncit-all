import { Card, CardContent, Divider, Stack, Typography } from '@mui/material';
import { StatusChip, type StatusColorMap } from '@duncit/ui';
import { useTranslation, type DateFormatter } from '@duncit/app-settings';
import type { PaymentStep } from './queries';

const STEP_STATUS_COLORS: StatusColorMap = {
  DONE: 'success',
  PENDING: 'warning',
  SKIPPED: 'default',
  FAILED: 'error',
};

interface Props {
  steps: PaymentStep[];
  finalizeAttempts: number;
  formatDateTime: DateFormatter['formatDateTime'];
}

/**
 * The finalization pipeline in execution order. `detail` carries the reason a
 * step was skipped and the message when it failed, so it is rendered for every
 * step that has one rather than only for failures.
 */
export default function StepsTimeline({ steps, finalizeAttempts, formatDateTime }: Readonly<Props>) {
  const { t } = useTranslation();
  // Two keys rather than a suffixed plural: languages that do not split on one
  // pick whichever their catalogue defines.
  const attemptsKey =
    finalizeAttempts === 1 ? 'finance.payment.finalizeAttemptsOne' : 'finance.payment.finalizeAttemptsMany';

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, width: '100%' }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700}>
          {t('finance.payment.stepsTitle')}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
          {t(attemptsKey, { vars: { n: finalizeAttempts } })}
        </Typography>

        {steps.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            {t('finance.payment.stepsEmpty')}
          </Typography>
        )}

        <Stack spacing={1.25} divider={<Divider flexItem />}>
          {steps.map((step) => (
            <Stack key={step.key} spacing={0.5}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                justifyContent="space-between"
                useFlexGap
                flexWrap="wrap"
              >
                <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                  <Typography variant="body2" fontWeight={600}>
                    {step.label}
                  </Typography>
                  <StatusChip status={step.status} colorMap={STEP_STATUS_COLORS} />
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {step.at ? formatDateTime(step.at) : t('finance.payment.stepNotRun')}
                </Typography>
              </Stack>
              {step.detail && (
                <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                  {step.detail}
                </Typography>
              )}
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
