import type { ComponentProps } from 'react';
import { YStack } from 'tamagui';

import { SurfaceCard } from '@/components/SurfaceCard';
import type { CoinRedemption } from '@/hooks/useCoinRedemption';

import { CoinRedeemField } from './CoinRedeemField';
import { CouponField } from './CouponField';
import { CouponTotal } from './CouponTotal';

type Props = ComponentProps<typeof CouponField> & {
  coins: CoinRedemption;
  /** The bill before any coupon or coins — struck through once discounted. */
  originalTotal: number;
};

/**
 * Coupon, coins and what is left to pay — one card, split by a hairline.
 * Shared by the pod and product checkouts so both read the same.
 */
export function CheckoutSavingsCard({ coins, originalTotal, ...coupon }: Readonly<Props>) {
  return (
    <SurfaceCard gap={14}>
      <CouponField {...coupon} />
      <YStack height={1} backgroundColor="$borderColor" />
      <CoinRedeemField coins={coins} />
      <CouponTotal
        currency={coupon.currency}
        effectiveTotal={coins.effectiveTotal}
        originalTotal={originalTotal}
      />
    </SurfaceCard>
  );
}
