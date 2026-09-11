import { Alert, Box } from '@mui/material';
import { APP_SHELL_MAX_WIDTH } from '../../app/appLayout';
import { useTranslation } from '../../i18n/useTranslation';

/** The unverified-email line under the header's first row. It sits between
 * the toolbar and the category switch, inset to the page gutter so it reads
 * as its own line rather than part of either. Native twin: VerifyEmailBanner. */
export default function HeaderVerifyEmail({ onOpen }: Readonly<{ onOpen: () => void }>) {
  const { t } = useTranslation();
  return (
    <Box
      sx={{ width: '100%', maxWidth: APP_SHELL_MAX_WIDTH, mx: 'auto', px: 2, pb: 1.5, boxSizing: 'border-box' }}
    >
      <Alert severity="info" onClick={onOpen} sx={{ cursor: 'pointer', py: 0.5 }}>
        {t('mweb.home.verifyYourEmail')}
      </Alert>
    </Box>
  );
}
