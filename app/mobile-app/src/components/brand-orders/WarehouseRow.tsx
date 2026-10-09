import { Text, XStack, YStack } from 'tamagui';
import {
  PICKUP_SHIPROCKET_STATE_KEYS,
  PICKUP_SHIPROCKET_TONE,
  pickupReview,
  pickupShiprocketState,
} from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';
import type { BrandWarehouse } from '@/hooks/useBrandWarehouses';
import { ToneChip } from './ToneChip';

/** One warehouse: nickname, address, whether it is the default, its review and
 * where it stands with ShipRocket (and why, when it is not ready). RN twin of
 * mWeb's brand-warehouses-page/WarehouseRow. */
export function WarehouseRow({ warehouse: w }: Readonly<{ warehouse: BrandWarehouse }>) {
  const { t } = useTranslation();
  const review = pickupReview(w.review_status);
  const state = pickupShiprocketState(w);
  const address = [w.address_line1, w.address_line2, w.city, w.state, w.pincode]
    .filter(Boolean)
    .join(', ');
  return (
    <YStack gap={6} paddingHorizontal={16} paddingVertical={12} testID={`brand-warehouse-${w.id}`}>
      <XStack alignItems="center" gap={8} flexWrap="wrap">
        <Text fontSize={15} fontWeight="700" color="$color">
          {w.nickname}
        </Text>
        {w.is_default ? (
          <ToneChip
            label={t('mweb.brandWarehouses.isDefault')}
            tone="moving"
            testID={`brand-warehouse-default-${w.id}`}
          />
        ) : null}
      </XStack>
      {address ? (
        <Text fontSize={13} color="$muted">
          {address}
        </Text>
      ) : null}
      <XStack gap={8} flexWrap="wrap">
        <ToneChip
          label={t(review.key)}
          tone={review.tone}
          testID={`brand-warehouse-review-${w.id}`}
        />
        <ToneChip
          label={t(PICKUP_SHIPROCKET_STATE_KEYS[state])}
          tone={PICKUP_SHIPROCKET_TONE[state]}
          testID={`brand-warehouse-shiprocket-${w.id}`}
        />
      </XStack>
      {w.shiprocket_error ? (
        <Text fontSize={12} color="$muted" testID={`brand-warehouse-error-${w.id}`}>
          {w.shiprocket_error}
        </Text>
      ) : null}
    </YStack>
  );
}
