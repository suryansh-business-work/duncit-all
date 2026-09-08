import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Card, CardContent, Snackbar, Stack, Typography } from '@mui/material';
import LockResetIcon from '@mui/icons-material/LockReset';
import { DuncitButton } from '@duncit/buttons';
import ChangePasswordDialog from './ChangePasswordDialog';
import DeletionRequestPanel from './DeletionRequestPanel';
import { MY_CONNECTED_ACCOUNTS, type ConnectedAccounts } from './connected-queries';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * Account security: the account password, plus the de-emphasised deletion
 * corner at the bottom of Profile → Settings.
 *
 * An account that signed up with Google has NO password, so this section offers
 * to CREATE one rather than change one it never had — and the flow behind it
 * never asks for a current password there is none of. `has_password` is what
 * decides, straight off the server, because the hash is select:false and only
 * the server can see it. Native twin.
 */
export default function SecuritySection() {
  const { t } = useTranslation();
  const [changeOpen, setChangeOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const { data, loading, refetch } = useQuery<{ myConnectedAccounts: ConnectedAccounts }>(
    MY_CONNECTED_ACCOUNTS
  );

  const hasPassword = data?.myConnectedAccounts?.has_password ?? true;
  const action = hasPassword
    ? t('mweb.account.changePassword')
    : t('mweb.account.createPassword');
  const hint = hasPassword
    ? t('mweb.account.changePasswordHint')
    : t('mweb.account.createPasswordHint');

  const handleChanged = () => {
    setToast(hasPassword ? t('mweb.account.passwordUpdated') : t('mweb.account.passwordCreated'));
    refetch().catch(() => undefined);
  };

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{
              alignItems: { sm: 'center' },
              justifyContent: 'space-between',
            }}
          >
            <Stack sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {t('mweb.account.password')}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {hint}
              </Typography>
            </Stack>
            <DuncitButton
              variant="outlined"
              startIcon={<LockResetIcon />}
              disabled={loading}
              onClick={() => setChangeOpen(true)}
              data-testid="open-change-password"
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '16px' }}
            >
              {action}
            </DuncitButton>
          </Stack>

          <DeletionRequestPanel onToast={setToast} />
        </Stack>
      </CardContent>

      <ChangePasswordDialog
        open={changeOpen}
        hasPassword={hasPassword}
        onClose={() => setChangeOpen(false)}
        onChanged={handleChanged}
      />

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" onClose={() => setToast(null)}>
          {toast}
        </Alert>
      </Snackbar>
    </Card>
  );
}
