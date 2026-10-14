import { Alert, AlertTitle } from '@mui/material';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * Shown on a FREE pod's request instead of the slot price: the host settles
 * the venue's charges directly, off the platform, so there is no amount to
 * quote. A polite status rather than an alert — a queue of free requests
 * should not interrupt a screen reader once per card.
 */
export default function FreePodNotice() {
  const { t } = useTranslation();
  return (
    <Alert severity="warning" role="status" data-testid="slot-request-free-pod-notice">
      <AlertTitle>{t('mweb.venueSlotRequests.freePodTitle')}</AlertTitle>
      {t('mweb.venueSlotRequests.freePodNotice')}
    </Alert>
  );
}
