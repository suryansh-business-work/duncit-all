import { Link as RouterLink } from 'react-router';
import { Alert } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';

interface Props {
  venueId: string;
  /** What the venue is missing out on while food is off — the page's own sentence. */
  message: string;
  'data-testid'?: string;
}

/**
 * What a food page shows for a venue that does not offer food: why there is
 * nothing here, and the way to the venue form's Food Menu section to turn it on.
 */
export default function VenueFoodOffAlert({ venueId, message, 'data-testid': testId }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Alert
      severity="info"
      data-testid={testId}
      action={
        <DuncitButton size="small" color="inherit" component={RouterLink} to={`/register-venue/${venueId}?selectedtab=food`}>
          {t('venueFoodOwner.common.editVenue')}
        </DuncitButton>
      }
    >
      {message}
    </Alert>
  );
}
