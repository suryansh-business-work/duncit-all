import { Link as RouterLink } from 'react-router';
import { Alert, Box } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * The state a venue page shows an owner who has no venue yet: the page's own
 * sentence, then the one way out of it. Shared by the availability and
 * settings pages so the prompt cannot drift (rule 40).
 */
export default function NoVenuesAlert({ message }: Readonly<{ message: string }>) {
  const { t } = useTranslation();
  return (
    <Alert severity="info">
      {message}
      <Box sx={{ mt: 1.5 }}>
        <DuncitButton
          component={RouterLink}
          to="/register-venue"
          variant="contained"
          size="small"
          sx={{ borderRadius: 999, fontWeight: 700 }}
        >
          {t('mweb.venueManagePage.newVenue')}
        </DuncitButton>
      </Box>
    </Alert>
  );
}
