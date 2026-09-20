import { Accordion, AccordionDetails, AccordionSummary, Chip, Stack, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import { NODE_KINDS, STEP_STATUS_KEYS, isNodeKind } from '../node-kinds';
import type { RunStep, StepStatus } from '../types';

interface Props {
  steps: readonly RunStep[];
  defaultExpanded?: boolean;
}

const STEP_COLOR: Record<StepStatus, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  OK: 'success',
  SKIPPED: 'warning',
  FAILED: 'error',
  WAITING: 'info',
};

/** What the engine did, step by step — the exit taken, the reason skipped, the error. */
export default function StepTrace({ steps, defaultExpanded = false }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatTime } = useDateFormat();
  return (
    <Accordion defaultExpanded={defaultExpanded} disableGutters variant="outlined" sx={{ borderRadius: 2, '&:before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="automation-step-trace" id="automation-step-trace-header">
        <Typography variant="subtitle2">
          {t('ai.automation.test.trace')} · {steps.length}
        </Typography>
      </AccordionSummary>
      <AccordionDetails id="automation-step-trace">
        <Stack spacing={1}>
          {steps.map((step, index) => {
            const kindLabel = isNodeKind(step.kind) ? t(NODE_KINDS[step.kind].labelKey) : step.kind;
            return (
              <Stack key={`${step.node_id}-${step.at}-${index}`} spacing={0.25}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Chip size="small" label={t(STEP_STATUS_KEYS[step.status] ?? step.status)} color={STEP_COLOR[step.status] ?? 'default'} sx={{ height: 20 }} />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {kindLabel}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', ml: 'auto' }}>
                    {formatTime(step.at)}
                  </Typography>
                </Stack>
                <Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {step.detail}
                </Typography>
              </Stack>
            );
          })}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
