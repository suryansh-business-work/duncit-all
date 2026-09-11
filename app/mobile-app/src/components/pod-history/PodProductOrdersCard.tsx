import { Spinner } from 'tamagui';

import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useTranslation } from '@/hooks/useTranslation';
import type { ProductOrder } from '@/utils/product-orders';
import { PodProductOrderItem } from './PodProductOrderItem';

/** "Products & tracking" — the add-on products the buyer purchased in this pod
 * with fulfilment/tracking. Renders nothing when there are no product orders
 * (the common case). RN twin of mWeb's PodProductOrdersCard. */
export function PodProductOrdersCard({
  orders,
  loading,
}: Readonly<{ orders: ProductOrder[]; loading: boolean }>) {
  const { t } = useTranslation();

  if (loading && orders.length === 0) {
    return (
      <SurfaceCard alignItems="center">
        <Spinner testID="po-loading" color="$primary" />
      </SurfaceCard>
    );
  }
  if (orders.length === 0) return null;

  return (
    <SurfaceCard testID="pod-product-orders-card" gap={12}>
      <SectionHeader title={t('mweb.podHistory.productsAndTracking')} />
      {orders.map((o) => (
        <PodProductOrderItem key={o.id} order={o} />
      ))}
    </SurfaceCard>
  );
}
