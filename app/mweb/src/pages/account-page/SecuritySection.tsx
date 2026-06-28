import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { useUserData } from '@duncit/user-context';
import {
  Alert,
  Button,
  Card,
  CardContent,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import LockResetIcon from '@mui/icons-material/LockReset';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import ConfirmDialog from '../../components/ConfirmDialog';
import { parseApiError } from '../../utils/parseApiError';
import ChangePasswordDialog from './ChangePasswordDialog';
import DeleteAccountDialog from './DeleteAccountDialog';
import { REQUEST_ACCOUNT_DELETION_OTP } from './security-queries';

/** Account security: change password + the de-emphasised, danger-styled delete
 * action at the bottom of Profile → Settings. */
export default function SecuritySection() {
  const { logout } = useUserData();
  const [changeOpen, setChangeOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [requestDeletionOtp, { loading: requesting }] = useMutation(REQUEST_ACCOUNT_DELETION_OTP);

  const confirmDeletion = async () => {
    setDeleteError(null);
    try {
      await requestDeletionOtp();
      setConfirmOpen(false);
      setDeleteOpen(true);
    } catch (e) {
      setDeleteError(parseApiError(e));
    }
  };

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            alignItems={{ sm: 'center' }}
            justifyContent="space-between"
          >
            <Stack sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                Password
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Change your password with an email verification code.
              </Typography>
            </Stack>
            <Button
              variant="outlined"
              startIcon={<LockResetIcon />}
              onClick={() => setChangeOpen(true)}
              data-testid="open-change-password"
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
            >
              Change password
            </Button>
          </Stack>

          <Button
            color="error"
            startIcon={<DeleteForeverIcon />}
            onClick={() => setConfirmOpen(true)}
            data-testid="open-delete-account"
            sx={{ textTransform: 'none', fontWeight: 700, alignSelf: 'flex-start' }}
          >
            Delete account
          </Button>
          {deleteError && (
            <Alert severity="error" onClose={() => setDeleteError(null)}>
              {deleteError}
            </Alert>
          )}
        </Stack>
      </CardContent>

      <ChangePasswordDialog
        open={changeOpen}
        onClose={() => setChangeOpen(false)}
        onChanged={() => setToast('Password updated')}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Delete your account?"
        message="This permanently deletes your account and data. This action cannot be undone."
        confirmLabel="Send code"
        destructive
        busy={requesting}
        onConfirm={() => {
          confirmDeletion().catch(() => undefined);
        }}
        onClose={() => setConfirmOpen(false)}
      />

      <DeleteAccountDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDeleted={logout}
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
