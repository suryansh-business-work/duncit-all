import { useTranslation } from '@duncit/shell';
import { SectionCard } from '@duncit/ui';
import LineItems from '../../../components/LineItems';
import type { StoreOrder } from '../queries';

/** What was bought: each line with its picture, variant, SKU, quantity and line total. */
export default function OrderItemsCard({ order }: Readonly<{ order: StoreOrder }>) {
  const { t } = useTranslation();
  const title = t('ecommPortal.orders.items');
  const lines = order.line_items.map((line) => ({
    key: `${line.product_id}:${line.variant_id}`,
    name: line.name,
    details: [line.variant_label, t('ecommPortal.common.skuValue', { vars: { sku: line.variant_sku || line.sku } })],
    imageUrl: line.image_url,
    qty: line.qty,
    unitPrice: line.unit_cost,
  }));
  return (
    <SectionCard title={title}>
      <LineItems lines={lines} ariaLabel={title} symbol={order.currency_symbol} />
    </SectionCard>
  );
}
