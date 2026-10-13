import { Text, XStack } from 'tamagui';

import { CartNoticeChip } from '@/components/cart/CartNoticeChip';
import { CartQuantityControl } from '@/components/cart/CartQuantityControl';
import { cartControlLabels } from '@/components/cart/cartControlLabels';
import { useCartControlNotice } from '@/hooks/useCartControlNotice';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  /** The product, for the control's spoken names. */
  name: string;
  quantity: number;
  maxQuantity: number;
  readOnly?: boolean;
  onUpdate?: (quantity: number) => void;
}

const TEST_IDS = {
  root: 'product-detail-stepper',
  add: 'product-detail-add',
  decrease: 'product-detail-dec',
  increase: 'product-detail-inc',
  count: 'product-detail-qty',
} as const;

/** How far above the buy bar the notice floats, clear of the bar's own edge. */
const NOTICE_TOP = -44;

/** Product-sheet cart control: the same "+" / remove · count · plus pill as
 * every card, at the end of the buy bar. Quantity is clamped to available
 * stock; a sold-out product says so beside a "+" that does nothing. Renders
 * nothing when the pod is view-only (already booked) or no handler is wired. */
export function ProductQuantityBar({
  name,
  quantity,
  maxQuantity,
  readOnly,
  onUpdate,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = cartControlLabels(t, name);
  const notice = useCartControlNotice(quantity);
  if (readOnly || !onUpdate) return null;
  const outOfStock = maxQuantity <= 0 && quantity <= 0;
  return (
    <XStack alignItems="center" justifyContent="flex-end" gap={12}>
      <CartNoticeChip
        notice={notice}
        labels={labels}
        testID="product-detail-notice"
        top={NOTICE_TOP}
      />
      {outOfStock ? (
        <Text testID="product-detail-out-of-stock" fontSize={13} fontWeight="600" color="$muted">
          {t('mweb.shop.outOfStock')}
        </Text>
      ) : null}
      <CartQuantityControl
        quantity={quantity}
        max={maxQuantity}
        labels={labels}
        onChange={onUpdate}
        testIds={TEST_IDS}
      />
    </XStack>
  );
}
