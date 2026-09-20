import { Chip, LinearProgress, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { useTranslation } from '@duncit/shell';
import type { BrandCompletion, BrandStepState } from '../queries';
import { useBrandStepLabels } from './useBrandStepLabels';

interface Props {
  completion: BrandCompletion;
}

type Translate = ReturnType<typeof useTranslation>['t'];

type StepColor = 'success' | 'warning' | 'default';

const stepColor = (step: BrandStepState): StepColor => {
  if (step.complete) return 'success';
  if (step.required) return 'warning';
  return 'default';
};

const stepStateLabel = (step: BrandStepState, t: Translate): string => {
  if (step.complete) return t('products.brandReview.stepDone');
  if (step.required) return t('products.brandReview.stepTodo');
  return t('products.brandReview.stepOptional');
};

/** How far through the wizard the partner is, step by step — the reviewer's
 * map of what is left before Approve unlocks. */
export default function BrandWizardSteps({ completion }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = useBrandStepLabels();
  return (
    <Stack spacing={1.5} data-testid="brand-wizard-steps">
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {t('products.brandReview.completion', { vars: { percent: completion.percent } })}
      </Typography>
      <LinearProgress
        variant="determinate"
        value={completion.percent}
        aria-label={t('products.brandReview.colCompletion')}
        sx={{ height: 8, borderRadius: 4 }}
      />
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
        {completion.steps.map((step) => (
          <Chip
            key={step.key}
            size="small"
            variant={step.complete ? 'filled' : 'outlined'}
            color={stepColor(step)}
            icon={step.complete ? <CheckCircleIcon /> : <RadioButtonUncheckedIcon />}
            label={`${labels[step.key] ?? step.key} · ${stepStateLabel(step, t)}`}
            data-testid={`brand-step-${step.key}`}
          />
        ))}
      </Stack>
    </Stack>
  );
}
