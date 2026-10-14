import { Alert, AlertTitle } from '@mui/material';
import { useTranslation } from '@duncit/shell';

/**
 * Shown on a FREE pod's slot request instead of any price or earning: the host
 * settles the venue's charges directly, off the platform, so Duncit quotes the
 * venue nothing. A polite status rather than an alert — a queue of free
 * requests should not interrupt a screen reader once per card.
 */
export default function FreePodNotice() {
  const { t } = useTranslation();
  return (
    <Alert severity="warning" role="status" data-testid="slot-request-free-pod-notice">
      <AlertTitle>{t('partners.slotRequestsPage.freePodTitle')}</AlertTitle>
      {t('partners.slotRequestsPage.freePodNotice')}
    </Alert>
  );
}
