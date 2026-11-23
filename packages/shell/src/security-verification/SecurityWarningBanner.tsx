import { Alert, AlertTitle, Typography } from '@mui/material';
import { useTranslation } from '../i18n/useTranslation';

/**
 * The warning that comes before everything else on the screen. A warning alert
 * (the theme's yellow), announced to screen readers the moment it appears — it
 * is the sentence the person must not scroll past.
 */
export function SecurityWarningBanner() {
  const { t } = useTranslation();
  return (
    <Alert severity="warning" variant="filled" role="alert" data-testid="security-warning-banner" sx={{ alignItems: 'flex-start' }}>
      <AlertTitle sx={{ fontWeight: 'bold' }}>{t('shell.securityVerification.warning.label')}</AlertTitle>
      <Typography variant="body2">{t('shell.securityVerification.warning.body')}</Typography>
    </Alert>
  );
}
