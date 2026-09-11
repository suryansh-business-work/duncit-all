import { Box, Card, Stack, Typography } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import SectionHeader from '../../components/SectionHeader';
import { useTranslation } from '../../i18n/useTranslation';

/** The four steps, as literal keys (rule 38 — never composed). */
const STEP_KEYS = [
  'mweb.giftCards.howStep1',
  'mweb.giftCards.howStep2',
  'mweb.giftCards.howStep3',
  'mweb.giftCards.howStep4',
] as const;

/** The step number: a small green disc on its tonal fill. */
const STEP_DISC_SX = {
  width: 24,
  height: 24,
  flexShrink: 0,
  borderRadius: '50%',
  display: 'grid',
  placeItems: 'center',
  fontSize: 12,
  fontWeight: 600,
  color: 'primary.main',
  bgcolor: (theme: Theme) => alpha(theme.palette.primary.main, 0.12),
} as const;

/** The "how gift cards work" instructions block — shared by the buy tab and
 * the redeem page so both tell exactly the same story. */
export default function HowItWorksCard() {
  const { t } = useTranslation();
  return (
    <Card sx={{ p: 2 }}>
      <SectionHeader title={t('mweb.giftCards.howTitle')} />
      <Stack spacing={1.25} sx={{ mt: 1.5 }}>
        {STEP_KEYS.map((stepKey, index) => (
          <Stack key={stepKey} direction="row" spacing={1.5} sx={{
            alignItems: "flex-start"
          }}>
            <Box sx={STEP_DISC_SX}>{index + 1}</Box>
            <Typography variant="body2" sx={{ pt: 0.25 }}>
              {t(stepKey)}
            </Typography>
          </Stack>
        ))}
      </Stack>
      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 1.5 }}>
        {t('mweb.giftCards.howNote')}
      </Typography>
    </Card>
  );
}
