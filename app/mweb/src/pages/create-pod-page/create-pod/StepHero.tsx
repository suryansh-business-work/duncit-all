import { useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import AiMonitorChip from './AiMonitorChip';
import PodGuidelinesDialog from './PodGuidelinesDialog';
import { STEP_TITLE_KEYS } from './create-pod.form';
import { useTranslation } from '../../../i18n/useTranslation';

interface Props {
  step: number;
  total: number;
  title: string;
  /** Accepted for existing callers, no longer drawn — the step title stands alone. */
  subtitle?: string;
}

/** Per-step hero: one slim pill per step (done and current in green), then the
 * step title with the "AI monitoring" chip (opens the guidelines dialog). The
 * "Step n of N" sentence is the progress bar's accessible name, not a caption.
 * Native twin: StepHeader. */
export default function StepHero({ step, total, title }: Readonly<Props>) {
  const [guideOpen, setGuideOpen] = useState(false);
  const { t } = useTranslation();
  const counter = t('mweb.createPod.stepCounter', { vars: { step: step + 1, total } });
  return (
    <Stack spacing={1.75}>
      <Stack
        direction="row"
        spacing={0.75}
        role="progressbar"
        aria-label={counter}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={step + 1}
      >
        {STEP_TITLE_KEYS.map((key, index) => (
          <Box
            key={key}
            sx={{
              flex: 1,
              height: 5,
              borderRadius: 999,
              bgcolor: index <= step ? 'primary.main' : 'action.hover',
            }}
          />
        ))}
      </Stack>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography component="h2" sx={{ fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.2, minWidth: 0 }}>
          {title}
        </Typography>
        <AiMonitorChip onClick={() => setGuideOpen(true)} />
      </Stack>
      <PodGuidelinesDialog open={guideOpen} onClose={() => setGuideOpen(false)} />
    </Stack>
  );
}
