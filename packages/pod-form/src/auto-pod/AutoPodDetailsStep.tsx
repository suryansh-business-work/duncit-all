import { Box, Stack, Typography } from '@mui/material';
import PodModeToggle from '../components/PodModeToggle';
import PodSections from '../PodSections';
import { useTranslation } from '../i18n/useTranslation';

/**
 * Step 2: the pod itself. Physical or virtual comes first because it reshapes
 * what follows — a virtual pod gains the Meeting Details section and loses the
 * products one — then the media, the reel and the sections an ordinary pod
 * has, minus Payment & Charges (the price and spots sit in Basic Information).
 */
export default function AutoPodDetailsStep() {
  const { t } = useTranslation();
  return (
    <Stack spacing={2}>
      <Box data-testid="auto-pod-mode">
        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.75 }}>
          {t('podForm.autoPod.modeLegend')}
        </Typography>
        <PodModeToggle />
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
          {t('podForm.autoPod.modeHint')}
        </Typography>
      </Box>
      <PodSections />
    </Stack>
  );
}
