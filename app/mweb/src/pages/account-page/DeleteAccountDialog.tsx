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
import {
  REQUEST_ACCOUNT_DELETION_OTP,
  SUBMIT_ACCOUNT_DELETION_REQUEST,
} from './security-queries';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

/**
 * The code step of the deletion flow — the warning lives in the parent
 * ConfirmDialog, which emails the code before opening this.
 *
 * Submitting FILES a request; it does not delete. The copy says so, because a
 * dialog that still said "permanently delete" would be describing something
 * that no longer happens here.
 */
export default function DeleteAccountDialog({ open, onClose, onSubmitted }: Readonly<Props>) {
  const { t } = useTranslation();
  const [info, setInfo] = useState<string | null>(t('mweb.account.deletion.otpSent'));
  const [requestOtp, { loading: requesting }] = useMutation(REQUEST_ACCOUNT_DELETION_OTP);
  const [submitRequest, { loading: submitting }] = useMutation(SUBMIT_ACCOUNT_DELETION_REQUEST);

  const handleResend = () => {
    requestOtp()
      .then(() => setInfo(t('mweb.account.deletion.otpSent')))
      .catch((e) => setInfo(parseApiError(e)));
  };

  const handleSubmit = async (values: DeleteAccountValues) => {
    try {
      await submitRequest({
        variables: { input: { otp: values.otp, reason: values.reason, surface: 'MWEB' } },
      });
      onSubmitted();
    } catch (e) {
      throw new Error(parseApiError(e));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t('mweb.account.deletion.action')}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          {info && <Alert severity="info">{info}</Alert>}
          <Typography variant="body2" color="text.secondary">
            {t('mweb.account.deletion.otpIntro')}
          </Typography>
          <DeleteAccountForm loading={submitting} onSubmit={handleSubmit} />
          <Typography variant="body2" color="text.secondary" textAlign="center">
            {t('mweb.account.deletion.didntGetIt')}{' '}
            <Link
              component="button"
              type="button"
              onClick={handleResend}
              disabled={requesting}
              underline="hover"
            >
              {requesting
                ? t('mweb.account.deletion.resending')
                : t('mweb.account.deletion.resend')}
            </Link>
          </Typography>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
