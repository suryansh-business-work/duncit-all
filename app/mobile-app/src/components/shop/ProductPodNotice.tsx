import { NoticeCard } from '@/components/attendance/NoticeCard';
import { LoadErrorNotice } from '@/components/club-admin/LoadErrorNotice';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  /** The pods-for-product lookup failed — offer a retry instead of "no pod". */
  failed: boolean;
  onRetry: () => void;
}

/** Why the product cannot be bought here: either the pod lookup failed (with a
 * Retry) or no live pod stocks it. Twin of mWeb's PodAvailabilityNotice. */
export function ProductPodNotice({ failed, onRetry }: Readonly<Props>) {
  const { t } = useTranslation();
  if (failed) {
    return (
      <LoadErrorNotice
        testID="product-detail-pods-error"
        message={t('mweb.productDetailPage.podsError')}
        retryLabel={t('mweb.productDetailPage.retry')}
        onRetry={onRetry}
      />
    );
  }
  return (
    <NoticeCard
      testID="product-detail-no-pod"
      tone="info"
      title={t('mweb.productDetailPage.noPod')}
    />
  );
}
