import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useUserData } from '@duncit/user-context';
import { Alert, AlertTitle, Stack, Typography } from '@mui/material';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { DuncitButton } from '@duncit/buttons';
import ConfirmDialog from '../../components/ConfirmDialog';
import DeleteAccountDialog from './DeleteAccountDialog';
import DeletionSubmittedDialog from './DeletionSubmittedDialog';
import { parseApiError } from '../../utils/parseApiError';
import { formatDate } from '../../utils/dateFormat';
import { useTranslation } from '../../i18n/useTranslation';
import {
  ACCOUNT_DELETION_SETTINGS,
  CANCEL_MY_ACCOUNT_DELETION_REQUEST,
  MY_ACCOUNT_DELETION_REQUEST,
  REQUEST_ACCOUNT_DELETION_OTP,
  type PendingRequest,
} from './security-queries';

interface Props {
  onToast: (message: string) => void;
}

/**
 * The deletion corner of Profile → Settings.
 *
 * Two states, never both: the member has an open request, or they can file
 * one. The banner replaces the button rather than sitting beside it, because
 * a "Request deletion" button under a "Deletion requested" notice reads as an
 * invitation to ask twice.
 */
export default function DeletionRequestPanel({ onToast }: Readonly<Props>) {
  const { t } = useTranslation();
  const { logout } = useUserData();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);
  const [submitted, setSubmitted] = useState<PendingRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data, refetch } = useQuery(MY_ACCOUNT_DELETION_REQUEST, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: settingsData } = useQuery(ACCOUNT_DELETION_SETTINGS);
  const [requestOtp, { loading: requesting }] = useMutation(REQUEST_ACCOUNT_DELETION_OTP);
  const [cancelRequest, { loading: cancelling }] = useMutation(CANCEL_MY_ACCOUNT_DELETION_REQUEST);

  const pending: PendingRequest | null = data?.myAccountDeletionRequest ?? null;
  const retentionDays: number | null = settingsData?.accountDeletionSettings?.retention_days ?? null;

  const startFlow = async () => {
    setError(null);
    try {
      await requestOtp();
      setConfirmOpen(false);
      setOtpOpen(true);
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  const withdraw = async () => {
    setError(null);
    try {
      await cancelRequest();
      await refetch();
      onToast(t('mweb.account.deletion.withdrawn'));
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  const onSubmitted = (request: PendingRequest) => {
    setOtpOpen(false);
    setSubmitted(request);
  };

  if (pending) {
    return (
      <Stack spacing={1}>
        <Alert severity="warning" data-testid="deletion-pending">
          <AlertTitle>{t('mweb.account.deletion.pendingTitle')}</AlertTitle>
          <Typography variant="body2">{t('mweb.account.deletion.pendingBody')}</Typography>
          <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5 }}>
            {t('mweb.account.deletion.deletesOn', {
              vars: { date: formatDate(pending.scheduled_delete_at) },
            })}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              display: "block",
              mt: 0.5
            }}>
            {t('mweb.account.deletion.pendingRef', { vars: { code: pending.request_id } })} ·{' '}
            {t('mweb.account.deletion.pendingOn', {
              vars: { date: formatDate(pending.requested_at) },
            })}
          </Typography>
        </Alert>
        <DuncitButton
          variant="outlined"
          onClick={() => {
            withdraw().catch(() => undefined);
          }}
          disabled={cancelling}
          data-testid="withdraw-deletion"
          sx={{ textTransform: 'none', fontWeight: 700, alignSelf: 'flex-start' }}
        >
          {cancelling
            ? t('mweb.account.deletion.withdrawing')
            : t('mweb.account.deletion.withdraw')}
        </DuncitButton>
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
      </Stack>
    );
  }

  return (
    <Stack spacing={1}>
      <DuncitButton
        color="error"
        startIcon={<DeleteForeverIcon />}
        onClick={() => setConfirmOpen(true)}
        data-testid="open-delete-account"
        sx={{ textTransform: 'none', fontWeight: 700, alignSelf: 'flex-start' }}
      >
        {t('mweb.account.deletion.action')}
      </DuncitButton>
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={t('mweb.account.deletion.confirmTitle')}
        message={
          retentionDays === null
            ? t('mweb.account.deletion.confirmSealed')
            : t('mweb.account.deletion.confirmSealedDays', { vars: { days: retentionDays } })
        }
        confirmLabel={t('mweb.account.deletion.confirmCta')}
        destructive
        busy={requesting}
        onConfirm={() => {
          startFlow().catch(() => undefined);
        }}
        onClose={() => setConfirmOpen(false)}
      />
      <DeleteAccountDialog
        open={otpOpen}
        onClose={() => setOtpOpen(false)}
        onSubmitted={onSubmitted}
      />
      <DeletionSubmittedDialog
        open={!!submitted}
        code={submitted?.request_id ?? ''}
        deletesOn={submitted?.scheduled_delete_at ?? ''}
        onSignOut={logout}
      />
    </Stack>
  );
}
