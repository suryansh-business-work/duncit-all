import { useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Alert,
  Dialog,
  DialogContent,
  DialogTitle,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import { DeleteAccountForm, type DeleteAccountValues } from '../../forms/delete-account';
import { parseApiError } from '../../utils/parseApiError';
import { DELETE_MY_ACCOUNT, REQUEST_ACCOUNT_DELETION_OTP } from './security-queries';

interface Props {
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

/** OTP step of the delete-account flow (the danger confirmation lives in the
 * parent ConfirmDialog, which requests the OTP before opening this). */
export default function DeleteAccountDialog({ open, onClose, onDeleted }: Readonly<Props>) {
  const [info, setInfo] = useState<string | null>('OTP sent to your email.');
  const [requestOtp, { loading: requesting }] = useMutation(REQUEST_ACCOUNT_DELETION_OTP);
  const [deleteAccount, { loading: deleting }] = useMutation(DELETE_MY_ACCOUNT);

  const handleResend = () => {
    requestOtp()
      .then(() => setInfo('OTP sent to your email.'))
      .catch((e) => setInfo(parseApiError(e)));
  };

  const handleDelete = async (values: DeleteAccountValues) => {
    try {
      await deleteAccount({ variables: { input: { otp: values.otp } } });
      onDeleted();
    } catch (e) {
      throw new Error(parseApiError(e));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Delete account</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          {info && <Alert severity="info">{info}</Alert>}
          <Typography variant="body2" color="text.secondary">
            Enter the one-time code to permanently delete your account.
          </Typography>
          <DeleteAccountForm loading={deleting} onSubmit={handleDelete} />
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Didn’t get it?{' '}
            <Link
              component="button"
              type="button"
              onClick={handleResend}
              disabled={requesting}
              underline="hover"
            >
              {requesting ? 'Resending…' : 'Resend OTP'}
            </Link>
          </Typography>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
