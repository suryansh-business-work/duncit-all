import { LinearProgress, Stack, Typography } from '@mui/material';

interface Props {
  step: number;
  total: number;
  title: string;
  subtitle: string;
}

/** Per-step hero: a slim progress bar, the "STEP n OF N" eyebrow, the big step
 * title and a one-line intro — the reskinned header of the Create Pod stepper. */
export default function StepHero({ step, total, title, subtitle }: Readonly<Props>) {
  return (
    <Stack spacing={0.75}>
      <LinearProgress
        variant="determinate"
        value={((step + 1) / total) * 100}
        aria-label={`Step ${step + 1} of ${total}`}
        sx={{ height: 6, borderRadius: 999 }}
      />
      <Typography
        variant="caption"
        color="primary"
        sx={{ fontWeight: 900, letterSpacing: '0.14em', mt: 0.5 }}
      >
        STEP {step + 1} OF {total}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 900, lineHeight: 1.12 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {subtitle}
      </Typography>
    </Stack>
  );
}
