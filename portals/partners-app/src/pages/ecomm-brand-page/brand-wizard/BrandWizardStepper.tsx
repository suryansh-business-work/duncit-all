import type { ReactNode } from 'react';
import { Box, Chip, Step, StepButton, StepContent, StepLabel, Stepper, Typography } from '@mui/material';
import { BRAND_WIZARD_STEPS, type BrandStepState, type BrandWizardStepKey } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import { stepLabels, type StepProblems } from './wizard-steps';

interface Props {
  activeStep: number;
  states: BrandStepState[];
  /** What is wrong on each step — shown in its heading, so a closed step still says so. */
  problems: StepProblems;
  /** A locked brand is read-only, so every step may be opened. */
  locked: boolean;
  onJump: (index: number) => void;
  renderBody: (key: BrandWizardStepKey, index: number) => ReactNode;
}

type StepChipTone = 'done' | 'todo' | 'optional';

const chipTone = (state: BrandStepState | undefined): StepChipTone => {
  if (state?.complete) return 'done';
  if (state?.required === false && state.key !== 'review') return 'optional';
  return 'todo';
};

/**
 * The ten-step vertical stepper. A completed or earlier step is a button; the
 * rest wait their turn. A step with something wrong on it is marked in its
 * heading and lists every message there — its fields are only on screen while
 * it is open, and a problem nobody can see is a problem nobody fixes — and it
 * can always be opened, whatever its place in the order.
 */
export default function BrandWizardStepper({ activeStep, states, problems, locked, onJump, renderBody }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = stepLabels(t);
  const chipLabel: Record<StepChipTone, string> = {
    done: t('partners.brandWizard.stepDone'),
    todo: t('partners.brandWizard.stepPending'),
    optional: t('partners.brandWizard.stepOptional'),
  };

  return (
    <Stepper activeStep={activeStep} orientation="vertical" nonLinear data-testid="brand-wizard-stepper">
      {BRAND_WIZARD_STEPS.map((step, index) => {
        const state = states[index];
        const tone = chipTone(state);
        const messages = problems[step.key];
        const wrong = messages.length > 0;
        const summary = (
          <Box component="span" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.5 }}>
            <Chip
              size="small"
              variant={tone === 'done' ? 'filled' : 'outlined'}
              color={tone === 'done' ? 'success' : 'default'}
              label={chipLabel[tone]}
              data-testid={`brand-wizard-step-chip-${step.key}`}
            />
            {/* A live region, so a message that appears on a step the partner has left is announced. */}
            <Box component="span" role="status" sx={{ display: 'flex', flexDirection: 'column' }} data-testid={`brand-wizard-step-errors-${step.key}`}>
              {messages.map((message) => (
                <Typography key={message} component="span" variant="caption" sx={{ color: 'error.main' }}>
                  {message}
                </Typography>
              ))}
            </Box>
          </Box>
        );
        const openable = locked || wrong || index < activeStep || state?.complete === true;
        const asButton = openable && index !== activeStep;
        const testId = `brand-wizard-step-${step.key}`;
        const label = (
          <StepLabel error={wrong} optional={summary} data-testid={asButton ? undefined : testId}>
            {labels[step.key]}
          </StepLabel>
        );
        return (
          <Step key={step.key} completed={state?.complete === true}>
            {asButton ? (
              // StepButton hands its OWN `optional` down to the label, replacing the label's.
              <StepButton optional={summary} onClick={() => onJump(index)} data-testid={testId}>
                {label}
              </StepButton>
            ) : (
              label
            )}
            <StepContent>{activeStep === index && renderBody(step.key, index)}</StepContent>
          </Step>
        );
      })}
    </Stepper>
  );
}
