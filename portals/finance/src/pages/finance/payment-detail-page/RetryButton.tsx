import { Button, CircularProgress } from '@mui/material';
import ReplayIcon from '@mui/icons-material/Replay';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  /** The step to re-run. */
  stepKey: string;
  /** What the whole page is busy with, so one row spins and the rest lock. */
  busyKey: string | null;
  onRetry: (stepKey: string) => void;
  /** The row's label, so the button says WHICH step it re-runs to a screen reader. */
  label: string;
}

/**
 * The row-level re-run. Present only on rows the server marked retryable, which
 * is why it takes a key rather than deciding for itself: a button that appears
 * beside work the server cannot redo is worse than no button.
 */
export default function RetryButton({ stepKey, busyKey, onRetry, label }: Readonly<Props>) {
  const { t } = useTranslation();
  const busy = busyKey === stepKey;

  return (
    <Button
      size="small"
      variant="outlined"
      color="warning"
      // Any run in flight locks every other button: two of them re-enter the
      // same phase-2 lease, and the loser silently does nothing.
      disabled={busyKey !== null}
      onClick={() => onRetry(stepKey)}
      aria-label={t('finance.payment.retryRowAria', { vars: { step: label } })}
      startIcon={busy ? <CircularProgress size={14} color="inherit" /> : <ReplayIcon />}
    >
      {t('finance.payment.retry')}
    </Button>
  );
}
