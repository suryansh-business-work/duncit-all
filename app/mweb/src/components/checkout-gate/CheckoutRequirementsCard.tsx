import { useNavigate } from 'react-router-dom';
import { Alert, AlertTitle, Box, Button, Stack, Typography } from '@mui/material';
import { CHECKOUT_REQUIREMENT_KEYS, type CheckoutRequirement } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * What is stopping this account paying, and where to go and fix it.
 *
 * Every unmet requirement is listed at once: sending someone to their profile
 * three times, once per discovery, is the thing this card exists to avoid.
 */
export default function CheckoutRequirementsCard({
  missing,
}: Readonly<{ missing: CheckoutRequirement[] }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  if (missing.length === 0) return null;

  return (
    <Alert severity="warning" sx={{ borderRadius: '16px', mb: 2 }}>
      <AlertTitle sx={{ fontWeight: 700 }}>{t('mweb.checkout.needTitle')}</AlertTitle>
      <Typography variant="body2">{t('mweb.checkout.needIntro')}</Typography>
      <Box component="ul" sx={{ mt: 0.5, mb: 1, pl: 2.5 }}>
        {missing.map((requirement) => (
          <Typography key={requirement} component="li" variant="body2">
            {t(CHECKOUT_REQUIREMENT_KEYS[requirement])}
          </Typography>
        ))}
      </Box>
      <Stack direction="row">
        <Button size="small" variant="outlined" color="inherit" onClick={() => navigate('/profile')}>
          {t('mweb.checkout.needAction')}
        </Button>
      </Stack>
    </Alert>
  );
}
