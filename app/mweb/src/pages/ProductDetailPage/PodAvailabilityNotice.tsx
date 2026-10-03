import { Alert } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  /** The pods-for-product lookup failed — offer a retry instead of "no pod". */
  failed: boolean;
  onRetry: () => void;
}

/** Why the product cannot be bought here: either the pod lookup failed (with a
 * Retry) or no live pod stocks it. Twin of the native ProductPodNotice. */
export default function PodAvailabilityNotice({ failed, onRetry }: Readonly<Props>) {
  const { t } = useTranslation();
  if (failed) {
    return (
      <Alert
        severity="warning"
        data-testid="product-detail-pods-error"
        action={
          <DuncitButton data-testid="product-detail-pods-error-retry" color="inherit" size="small" onClick={onRetry}>
            {t('mweb.productDetailPage.retry')}
          </DuncitButton>
        }
      >
        {t('mweb.productDetailPage.podsError')}
      </Alert>
    );
  }
  return (
    <Alert severity="info" data-testid="product-detail-no-pod">
      {t('mweb.productDetailPage.noPod')}
    </Alert>
  );
}
