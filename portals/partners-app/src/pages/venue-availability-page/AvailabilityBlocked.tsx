import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';
import { Alert, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';

interface Props {
  severity: 'error' | 'warning';
  message: string;
  /** The venue picker, when the page opened on the selected venue. */
  picker?: ReactNode;
}

/** Shown instead of the calendar when this venue's availability is not the
 *  caller's to edit — it is not theirs, or it is not approved yet. */
export default function AvailabilityBlocked({ severity, message, picker }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={2} sx={{ width: '100%' }}>
      {picker}
      <Alert severity={severity}>{message}</Alert>
      <DuncitButton component={RouterLink} to="/register-venue" variant="outlined">
        {t('partners.venueAvailabilityPage.backToVenues')}
      </DuncitButton>
    </Stack>
  );
}
