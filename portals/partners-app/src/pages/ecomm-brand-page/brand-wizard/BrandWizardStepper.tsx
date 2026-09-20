import type { ReactNode } from 'react';
import { Chip, Step, StepButton, StepContent, StepLabel, Stepper } from '@mui/material';
import { BRAND_WIZARD_STEPS, type BrandStepState, type BrandWizardStepKey } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import { stepLabels } from './wizard-steps';

interface Props {
  activeStep: number;
  states: BrandStepState[];
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

/** The ten-step vertical stepper. A completed or earlier step is a button; the rest wait their turn. */
export default function BrandWizardStepper({ activeStep, states, locked, onJump, renderBody }: Readonly<Props>) {
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
        const chip = (
          <Chip
            size="small"
            variant={tone === 'done' ? 'filled' : 'outlined'}
            color={tone === 'done' ? 'success' : 'default'}
            label={chipLabel[tone]}
            data-testid={`brand-wizard-step-chip-${step.key}`}
          />
        );
        const openable = locked || index < activeStep || state?.complete === true;
        return (
          <Step key={step.key} completed={state?.complete === true}>
            {openable && index !== activeStep ? (
              <StepButton optional={chip} onClick={() => onJump(index)} data-testid={`brand-wizard-step-${step.key}`}>
                {labels[step.key]}
              </StepButton>
            ) : (
              <StepLabel optional={chip} data-testid={`brand-wizard-step-${step.key}`}>
                {labels[step.key]}
              </StepLabel>
            )}
            <StepContent>{activeStep === index && renderBody(step.key, index)}</StepContent>
          </Step>
        );
      })}
    </Stepper>
  );
}
