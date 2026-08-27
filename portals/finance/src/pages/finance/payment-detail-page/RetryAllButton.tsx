import { useState } from 'react';
import ReplayIcon from '@mui/icons-material/Replay';
import { DuncitButton } from '@duncit/buttons';
import { ConfirmDialog } from '@duncit/dialogs';
import { useTranslation } from '@duncit/app-settings';
import { RETRY_ALL } from './useRetrySteps';
import type { PaymentDetail } from './queries';

interface Props {
  detail: PaymentDetail;
  busyKey: string | null;
  onRetryAll: () => void;
}

/**
 * The page-level re-run: everything this payment still owes, in one press.
 *
 * It confirms first, and the two repairs it can perform are worded differently
 * because they are not the same risk. Re-running a receipt e-mail is routine;
 * re-running a rolled-back core claims a seat and issues a ticket, and whoever
 * presses it should read that before it happens rather than after.
 */
export default function RetryAllButton({ detail, busyKey, onRetryAll }: Readonly<Props>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const core = detail.can_retry_finalize;
  const nothingToDo = !core && detail.retryable_step_keys.length === 0;
  if (nothingToDo) return null;

  const titleKey = core ? 'finance.payment.retryCoreTitle' : 'finance.payment.retryAllTitle';
  const bodyKey = core ? 'finance.payment.retryCoreBody' : 'finance.payment.retryAllBody';

  return (
    <>
      <DuncitButton
        variant="contained"
        color="warning"
        startIcon={<ReplayIcon />}
        disabled={busyKey !== null}
        onClick={() => setOpen(true)}
      >
        {busyKey === RETRY_ALL ? t('finance.payment.retrying') : t('finance.payment.retryAll')}
      </DuncitButton>
      <ConfirmDialog
        open={open}
        title={t(titleKey)}
        message={t(bodyKey)}
        confirmLabel={t('finance.payment.retryConfirm')}
        cancelLabel={t('finance.payment.cancel')}
        confirmColor="warning"
        busy={busyKey === RETRY_ALL}
        busyLabel={t('finance.payment.retrying')}
        onClose={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          onRetryAll();
        }}
      />
    </>
  );
}
