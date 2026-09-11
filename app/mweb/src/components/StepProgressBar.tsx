import { Box, Stack } from '@mui/material';

interface Props {
  /** One stable id per step — the segment keys. */
  steps: readonly string[];
  /** 1-based position: segments up to and including it are filled. */
  current: number;
  /** Read by assistive tech in place of the old "Step X of N" caption. */
  label: string;
}

/**
 * The calm stepper: a slim row of pill segments, green up to the current step
 * and hairline after it. Signup and the onboarding survey draw it instead of a
 * numbered rail plus a "Step X of N" line — the bar already says where you are.
 * Native twin: components/StepProgressBar.
 */
export default function StepProgressBar({ steps, current, label }: Readonly<Props>) {
  return (
    <Stack
      direction="row"
      spacing={0.75}
      role="progressbar"
      aria-label={label}
      aria-valuemin={1}
      aria-valuemax={steps.length}
      aria-valuenow={current}
    >
      {steps.map((id, index) => (
        <Box
          key={id}
          sx={{
            flex: 1,
            height: 6,
            borderRadius: '999px',
            bgcolor: index < current ? 'primary.main' : 'divider',
          }}
        />
      ))}
    </Stack>
  );
}
