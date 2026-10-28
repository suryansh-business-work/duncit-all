import { Alert, Stack, Typography } from '@mui/material';
import LockClockOutlinedIcon from '@mui/icons-material/LockClockOutlined';
import type { LiteRegistrationStatus } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';

/** Where the check-in code will be: why it is not here yet, and what makes it appear. */
export function CheckInLocked({ status }: Readonly<{ status: LiteRegistrationStatus }>) {
  const { t } = useWebT();
  return (
    <Stack spacing={1} sx={{ alignItems: 'center', textAlign: 'center' }} data-testid="check-in-locked">
      <Typography variant="overline" color="text.secondary">
        {t('liteWeb.ticket.codeLabel')}
      </Typography>
      <Alert severity="info" icon={<LockClockOutlinedIcon fontSize="inherit" />} sx={{ textAlign: 'left', width: '100%' }}>
        {status === 'PAYMENT_PENDING' ? t('liteWeb.ticket.codeAfterPayment') : t('liteWeb.ticket.codeAfterConfirm')}
      </Alert>
    </Stack>
  );
}
