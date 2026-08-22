import { Link as RouterLink } from 'react-router-dom';
import { Alert, Button, Stack } from '@mui/material';
import { useTranslation } from '@duncit/shell';

interface Props {
  severity: 'error' | 'warning';
  message: string;
}

/** Shown instead of the calendar when this venue's availability is not the
 *  caller's to edit — it is not theirs, or it is not approved yet. */
export default function AvailabilityBlocked({ severity, message }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={2} sx={{ width: '100%' }}>
      <Alert severity={severity}>{message}</Alert>
      <Button component={RouterLink} to="/register-venue" variant="outlined">
        {t('partners.venueAvailabilityPage.backToVenues')}
      </Button>
    </Stack>
  );
}
