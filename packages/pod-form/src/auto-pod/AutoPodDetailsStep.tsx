import { Box, Stack, Typography } from '@mui/material';
import PodModeToggle from '../components/PodModeToggle';
import PodSections from '../PodSections';
import { useTranslation } from '../i18n/useTranslation';

/**
 * Step 2: the pod itself. Physical or virtual comes first because it reshapes
 * what follows — a virtual pod loses the products section — then the media,
 * the reel and the sections an ordinary pod has, minus where and when it
 * happens and Payment & Charges: the venue's slot fixes a physical pod's
 * date, and the host sets the price, the spots and (on a virtual pod) the
 * meeting details when they assign themselves.
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
          {t('podForm.autoPod.modeHintHostBrings')}
        </Typography>
      </Box>
      <PodSections />
    </Stack>
  );
}
