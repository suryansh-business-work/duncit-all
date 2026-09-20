import { Link as RouterLink } from 'react-router';
import { Alert, AlertTitle, Link } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';

/**
 * No GoDaddy key yet.
 *
 * Every page under Domain reads the same credential, so every one of them says
 * where it goes rather than rendering an empty zone that looks like a domain
 * with nothing in it.
 */
export default function NotConfigured() {
  const { t } = useTranslation();
  return (
    <Alert severity="info" data-testid="dns-not-configured">
      <AlertTitle>{t('tech.dns.notConfiguredTitle')}</AlertTitle>
      {t('tech.dns.notConfigured')}{' '}
      <Link component={RouterLink} to="/" data-testid="dns-open-environment">
        {t('shell.nav.environmentVariables')}
      </Link>
    </Alert>
  );
}
