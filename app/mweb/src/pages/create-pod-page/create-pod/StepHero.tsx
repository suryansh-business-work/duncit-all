import { useState } from 'react';
import { LinearProgress, Stack, Typography } from '@mui/material';
import AiMonitorChip from './AiMonitorChip';
import PodGuidelinesDialog from './PodGuidelinesDialog';
import { useTranslation } from '../../../i18n/useTranslation';

interface Props {
  step: number;
  total: number;
  title: string;
  subtitle: string;
}

/** Per-step hero: a slim progress bar, the "STEP n OF N" eyebrow with the
 * "AI monitoring" chip (opens the guidelines dialog), the big step title and a
 * one-line intro — the reskinned header of the Create Pod stepper. */
export default function StepHero({ step, total, title, subtitle }: Readonly<Props>) {
  const [guideOpen, setGuideOpen] = useState(false);
  const { t } = useTranslation();
  // One sentence for both surfaces (rule 27); the eyebrow keeps its caps in CSS
  // rather than in the copy, which a translator would have to re-shout.
  const counter = t('mweb.createPod.stepCounter', { vars: { step: step + 1, total } });
  return (
    <Stack spacing={0.75}>
      <LinearProgress
        variant="determinate"
        value={((step + 1) / total) * 100}
        aria-label={counter}
        sx={{ height: 6, borderRadius: 999 }}
      />
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          mt: 0.5
        }}>
        <Typography
          variant="caption"
          color="primary"
          sx={{ fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}
        >
          {counter}
        </Typography>
        <AiMonitorChip onClick={() => setGuideOpen(true)} />
      </Stack>
      <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.12 }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{
        color: "text.secondary"
      }}>
        {subtitle}
      </Typography>
      <PodGuidelinesDialog open={guideOpen} onClose={() => setGuideOpen(false)} />
    </Stack>
  );
}
