import { Text, XStack, YStack } from 'tamagui';
import {
  foodCouponMinOrderText,
  foodCouponPerPersonText,
  foodCouponUsesText,
  foodCouponWindow,
  type FoodOwnerCoupon,
} from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { ToggleRow } from '@/components/ToggleRow';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  coupon: FoodOwnerCoupon;
  /** The switch is waiting for the server's answer on this coupon. */
  switching: boolean;
  onToggle: (coupon: FoodOwnerCoupon) => void;
  onEdit: (coupon: FoodOwnerCoupon) => void;
  onDelete: (coupon: FoodOwnerCoupon) => void;
}

function Fact({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <XStack gap={8} justifyContent="space-between">
      <Text fontSize={12} color="$muted">
        {label}
      </Text>
      <Text fontSize={12} fontWeight="600" color="$color">
        {value}
      </Text>
    </XStack>
  );
}

/** One of the venue's food coupons: what it takes off, when and how often it works, its switch, edit and delete. */
export function FoodCouponCard({ coupon, switching, onToggle, onEdit, onDelete }: Readonly<Props>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const span = foodCouponWindow(t, coupon, (iso) => fmt.formatDateTime(iso));
  const named = { vars: { name: coupon.code } };

  return (
    <SurfaceCard testID={`food-coupon-${coupon.id}`} gap={8}>
      <XStack justifyContent="space-between" alignItems="center" gap={8}>
        <Text flex={1} fontSize={16} fontWeight="800" color="$color" numberOfLines={1}>
          {coupon.code}
        </Text>
        <Text fontSize={16} fontWeight="800" color="$primary">
          {t('venueFoodOwner.coupons.pctValue', { vars: { pct: coupon.discount_pct } })}
        </Text>
      </XStack>
      {coupon.description ? (
        <Text fontSize={12} color="$muted">
          {coupon.description}
        </Text>
      ) : null}
      <YStack gap={4}>
        <Fact
          label={t('venueFoodOwner.coupons.minOrder')}
          value={foodCouponMinOrderText(t, coupon)}
        />
        <Fact label={t('venueFoodOwner.coupons.validFrom')} value={span.from} />
        <Fact label={t('venueFoodOwner.coupons.validUntil')} value={span.until} />
        <Fact label={t('venueFoodOwner.coupons.colUses')} value={foodCouponUsesText(t, coupon)} />
        <Fact
          label={t('venueFoodOwner.coupons.perPerson')}
          value={foodCouponPerPersonText(t, coupon)}
        />
      </YStack>
      <ToggleRow
        testID={`food-coupon-active-${coupon.id}`}
        label={t('venueFoodOwner.common.activeOf', named)}
        value={coupon.is_active}
        disabled={switching}
        onChange={() => onToggle(coupon)}
      />
      <XStack gap={8}>
        <DuncitButton
          testID={`food-coupon-edit-${coupon.id}`}
          label={t('venueFoodOwner.common.edit')}
          accessibilityLabel={t('venueFoodOwner.common.editNamed', named)}
          size="sm"
          variant="outline"
          onPress={() => onEdit(coupon)}
        />
        <DuncitButton
          testID={`food-coupon-delete-${coupon.id}`}
          label={t('venueFoodOwner.common.delete')}
          accessibilityLabel={t('venueFoodOwner.common.deleteNamed', named)}
          size="sm"
          variant="ghost"
          tone="danger"
          onPress={() => onDelete(coupon)}
        />
      </XStack>
    </SurfaceCard>
  );
}
