import { Alert, Avatar, Paper, Stack, Typography } from '@mui/material';
import { useTranslation } from '../../i18n/useTranslation';

/** The four steps, as literal keys (rule 38 — never composed). */
const STEP_KEYS = [
  'mweb.giftCards.howStep1',
  'mweb.giftCards.howStep2',
  'mweb.giftCards.howStep3',
  'mweb.giftCards.howStep4',
] as const;

/** The "how gift cards work" instructions block — shared by the buy tab and
 * the redeem page so both tell exactly the same story. */
export default function HowItWorksCard() {
  const { t } = useTranslation();
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: '16px' }}>
      <Typography variant="subtitle1" sx={{
        fontWeight: 700
      }}>
        {t('mweb.giftCards.howTitle')}
      </Typography>
      <Stack spacing={1.25} sx={{ mt: 1.5 }}>
        {STEP_KEYS.map((stepKey, index) => (
          <Stack key={stepKey} direction="row" spacing={1.5} sx={{
            alignItems: "flex-start"
          }}>
            <Avatar sx={{ width: 24, height: 24, fontSize: 13, fontWeight: 700, bgcolor: 'primary.main' }}>
              {index + 1}
            </Avatar>
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                pt: 0.25
              }}>
              {t(stepKey)}
            </Typography>
          </Stack>
        ))}
      </Stack>
      <Alert severity="info" sx={{ mt: 1.5, borderRadius: '16px' }}>
        {t('mweb.giftCards.howNote')}
      </Alert>
    </Paper>
  );
}
