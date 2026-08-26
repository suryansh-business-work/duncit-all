import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { formatDate } from '../../utils/dateFormat';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  open: boolean;
  code: string;
  /** The date the account is scheduled to go, as the server stamped it. */
  deletesOn: string;
  onSignOut: () => void;
}

/**
 * What happens the moment a deletion request is filed: the member is told the
 * date, and then signed out.
 *
 * Signing out is the point. A request to be deleted that leaves the person
 * sitting in a fully working session reads as "nothing happened" — and the one
 * thing this flow has to get across is that something now WILL happen, on a
 * date, unless they come back and stop it. That is also why there is no cancel
 * on this dialog: the withdrawal lives behind the next sign-in, where they will
 * be asked about it directly.
 */
export default function DeletionSubmittedDialog({
  open,
  code,
  deletesOn,
  onSignOut,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} fullWidth maxWidth="xs" data-testid="deletion-submitted">
      <DialogTitle sx={{ fontWeight: 700 }}>
        {t('mweb.account.deletion.submittedTitle')}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Alert severity="warning">
            {t('mweb.account.deletion.submittedOn', {
              vars: { date: formatDate(deletesOn) },
            })}
          </Alert>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('mweb.account.deletion.submittedSealed')}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('mweb.account.deletion.pendingRef', { vars: { code } })}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          onClick={onSignOut}
          data-testid="deletion-sign-out"
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          {t('mweb.account.deletion.signOutNow')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
