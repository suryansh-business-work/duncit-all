import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  AlertTitle,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import {
  CANCEL_MY_ACCOUNT_DELETION_REQUEST,
  MY_ACCOUNT_DELETION_REQUEST,
  type PendingRequest,
} from '../pages/account-page/security-queries';
import { parseApiError } from '../utils/parseApiError';
import { formatDate } from '../utils/dateFormat';
import { useTranslation } from '../i18n/useTranslation';

/** Marks this browser session as having been told. Cleared by logout, which
 * wipes sessionStorage whole — so the next sign-in asks again, which is
 * precisely when it is worth asking. */
const SEEN_KEY = 'duncit_deletion_notice_seen';

function alreadySeen(): boolean {
  try {
    return globalThis.sessionStorage.getItem(SEEN_KEY) === '1';
  } catch {
    // Storage disabled: showing it once per page load is the safe side of this
    // particular error to be on.
    return false;
  }
}

function markSeen(): void {
  try {
    globalThis.sessionStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* storage unavailable — the notice simply shows again */
  }
}

/**
 * The first thing a member sees on signing back in with a deletion pending.
 *
 * Filing the request signs them out, so this is the other half of that: coming
 * back has to mean being told the account is on a clock, and being offered the
 * way off it in the same breath. Anything less and the only warning they ever
 * got was on a screen they were signed out of.
 *
 * Once per session, not once per page: it is a warning, not a nag, and logging
 * out clears the flag so the next sign-in asks again.
 */
export default function DeletionNoticeDialog() {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(alreadySeen);
  const [error, setError] = useState<string | null>(null);
  const { data, refetch } = useQuery(MY_ACCOUNT_DELETION_REQUEST, {
    fetchPolicy: 'cache-and-network',
    skip: dismissed,
  });
  const [cancelRequest, { loading: cancelling }] = useMutation(CANCEL_MY_ACCOUNT_DELETION_REQUEST);

  const pending: PendingRequest | null = data?.myAccountDeletionRequest ?? null;

  const close = () => {
    markSeen();
    setDismissed(true);
  };

  const withdraw = async () => {
    setError(null);
    try {
      await cancelRequest();
      await refetch();
      close();
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  if (dismissed || !pending) return null;

  return (
    <Dialog open fullWidth maxWidth="xs" onClose={close} data-testid="deletion-notice">
      <DialogTitle sx={{ fontWeight: 700 }}>
        {t('mweb.account.deletion.noticeTitle')}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Alert severity="warning">
            <AlertTitle sx={{ fontWeight: 700 }}>
              {t('mweb.account.deletion.deletesOn', {
                vars: { date: formatDate(pending.scheduled_delete_at) },
              })}
            </AlertTitle>
            {pending.days_remaining !== null &&
              t('mweb.account.deletion.noticeDaysLeft', {
                vars: { count: pending.days_remaining },
              })}
          </Alert>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('mweb.account.deletion.noticeBody')}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('mweb.account.deletion.pendingRef', { vars: { code: pending.request_id } })}
          </Typography>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close} sx={{ textTransform: 'none' }} data-testid="deletion-notice-keep">
          {t('mweb.account.deletion.noticeKeep')}
        </Button>
        <Button
          variant="contained"
          disabled={cancelling}
          onClick={() => {
            withdraw().catch(() => undefined);
          }}
          data-testid="deletion-notice-withdraw"
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          {cancelling
            ? t('mweb.account.deletion.withdrawing')
            : t('mweb.account.deletion.withdraw')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
