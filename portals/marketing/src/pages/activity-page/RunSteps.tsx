import { Box, Stack, Typography } from '@mui/material';
import { StatusChip } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import { STEP_STATUS_COLORS, STEP_STATUS_LABEL } from './copy';
import type { MarketingRunStep } from './queries';
import { formatDuration, type Translate } from './runFormat';

interface SummaryProps {
  label: string;
  text: string;
}

/** One line of a step's input or output, when the step recorded one. */
function StepSummary({ label, text }: Readonly<SummaryProps>) {
  if (!text) return null;
  return (
    <Typography variant="caption" component="div" sx={{ color: 'text.secondary', wordBreak: 'break-word' }}>
      <Box component="span" sx={{ fontWeight: 700 }}>
        {label}
      </Box>{' '}
      {text}
    </Typography>
  );
}

function StepItem({ step, t }: Readonly<{ step: MarketingRunStep; t: Translate }>) {
  return (
    <Stack component="li" spacing={0.5} sx={{ py: 1, borderBottom: 1, borderColor: 'divider' }} data-testid="marketing-run-step">
      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <StatusChip status={step.status} colorMap={STEP_STATUS_COLORS} label={t(STEP_STATUS_LABEL[step.status])} />
        <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, minWidth: 0 }}>
          {step.label || step.key}
        </Typography>
        {step.ms > 0 && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {formatDuration(step.ms, t)}
          </Typography>
        )}
      </Stack>
      {step.tool && (
        <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
          {t('marketing.runs.stepTool', { vars: { tool: step.tool } })}
        </Typography>
      )}
      <StepSummary label={t('marketing.runs.stepInput')} text={step.input_summary} />
      <StepSummary label={t('marketing.runs.stepOutput')} text={step.output_summary} />
      {step.error && (
        <Typography variant="caption" component="div" sx={{ color: 'error.main', wordBreak: 'break-word' }}>
          {step.error}
        </Typography>
      )}
    </Stack>
  );
}

/** The run's steps in order: what each did, with what, and how it went. */
export default function RunSteps({ steps }: Readonly<{ steps: MarketingRunStep[] }>) {
  const { t } = useTranslation();
  return (
    <Box data-testid="marketing-run-steps">
      <Typography component="h3" variant="subtitle2" sx={{ mb: 0.5 }}>
        {t('marketing.runs.stepsTitle')}
      </Typography>
      {steps.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('marketing.runs.noSteps')}
        </Typography>
      ) : (
        <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {steps.map((step) => (
            <StepItem key={step.key} step={step} t={t} />
          ))}
        </Box>
      )}
    </Box>
  );
}
