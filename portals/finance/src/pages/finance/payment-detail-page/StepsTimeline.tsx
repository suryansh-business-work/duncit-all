import { Divider, Stack, Typography } from '@mui/material';
import { StatusChip, type StatusColorMap } from '@duncit/ui';
import { useTranslation, type DateFormatter } from '@duncit/app-settings';
import RetryButton from './RetryButton';
import SectionBlock from './SectionBlock';
import type { PaymentStep } from './queries';

const STEP_STATUS_COLORS: StatusColorMap = {
  DONE: 'success',
  PENDING: 'warning',
  SKIPPED: 'default',
  FAILED: 'error',
};

interface StepRowProps {
  step: PaymentStep;
  busyKey: string | null;
  onRetry: (stepKey: string) => void;
  formatDateTime: DateFormatter['formatDateTime'];
}

/** Hoisted rather than nested in the list: a component declared inside its
 * parent is a new type on every render, so every row would remount. */
function StepRow({ step, busyKey, onRetry, formatDateTime }: Readonly<StepRowProps>) {
  const { t } = useTranslation();

  return (
    <Stack spacing={0.5}>
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap"
        }}>
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{
            alignItems: "center",
            flexWrap: "wrap"
          }}>
          <Typography variant="body2" sx={{
            fontWeight: 600
          }}>
            {step.label}
          </Typography>
          <StatusChip status={step.status} colorMap={STEP_STATUS_COLORS} />
        </Stack>
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{
            alignItems: "center",
            flexWrap: "wrap"
          }}>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {step.at ? formatDateTime(step.at) : t('finance.payment.stepNotRun')}
          </Typography>
          {step.can_retry && (
            <RetryButton
              stepKey={step.key}
              label={step.label}
              busyKey={busyKey}
              onRetry={onRetry}
            />
          )}
        </Stack>
      </Stack>
      {step.detail && (
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            wordBreak: 'break-word'
          }}>
          {step.detail}
        </Typography>
      )}
    </Stack>
  );
}

interface Props {
  steps: PaymentStep[];
  busyKey: string | null;
  onRetry: (stepKey: string) => void;
  formatDateTime: DateFormatter['formatDateTime'];
}

/**
 * The finalization pipeline in execution order. `detail` carries the reason a
 * step was skipped and the message when it failed, so it is rendered for every
 * step that has one rather than only for failures.
 */
export default function StepsTimeline({ steps, busyKey, onRetry, formatDateTime }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <SectionBlock title={t('finance.payment.stepsTitle')}>
      {steps.length === 0 && (
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          {t('finance.payment.stepsEmpty')}
        </Typography>
      )}
      <Stack spacing={1.25} divider={<Divider flexItem />}>
        {steps.map((step) => (
          <StepRow
            key={step.key}
            step={step}
            busyKey={busyKey}
            onRetry={onRetry}
            formatDateTime={formatDateTime}
          />
        ))}
      </Stack>
    </SectionBlock>
  );
}
