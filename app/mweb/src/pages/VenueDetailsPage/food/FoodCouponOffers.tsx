import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { Stack, Typography } from '@mui/material';
import LocalOfferIcon from '@mui/icons-material/LocalOfferOutlined';
import { DuncitButton } from '@duncit/buttons';
import { AVAILABLE_VENUE_FOOD_COUPONS_QUERY, formatFoodMoney, type AvailableVenueFoodCoupon } from '@duncit/utils';
import { useTranslation } from '../../../i18n/useTranslation';
import { useDateFormat } from '../../../utils/dateFormat';
import type { FoodCouponControl } from './useFoodCoupon';

const AVAILABLE_VENUE_FOOD_COUPONS = gql(AVAILABLE_VENUE_FOOD_COUPONS_QUERY);

interface Props {
  venueId: string;
  coupon: FoodCouponControl;
  currency: string;
  disabled: boolean;
}

/**
 * The venue's coupons a guest can pick from, above the code field: each with
 * what it gives and needs, and one press to apply it. Applying goes through the
 * same server check as a typed code, so a code that no longer fits this cart is
 * refused there in the usual words. Hidden once a code is applied, and when the
 * venue has none to offer — the field alone still takes a code the venue handed
 * out itself.
 */
export default function FoodCouponOffers({ venueId, coupon, currency, disabled }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const { data } = useQuery<{ availableVenueFoodCoupons: AvailableVenueFoodCoupon[] }>(AVAILABLE_VENUE_FOOD_COUPONS, {
    variables: { venueId },
    fetchPolicy: 'cache-and-network',
  });
  const offers = data?.availableVenueFoodCoupons ?? [];
  if (coupon.applied || offers.length === 0) return null;

  return (
    <Stack spacing={1} data-testid="food-coupon-offers">
      <Typography component="h3" variant="body2" sx={{ fontWeight: 600 }}>
        {t('mweb.venueFood.coupon.offersTitle')}
      </Typography>
      <Stack component="ul" spacing={1} sx={{ listStyle: 'none', m: 0, p: 0 }}>
        {offers.map((offer) => (
          <Stack
            key={offer.code}
            component="li"
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', border: 1, borderColor: 'divider', borderRadius: 1, p: 1 }}
            data-testid={`food-coupon-offer-${offer.code}`}
          >
            <LocalOfferIcon color="success" fontSize="small" aria-hidden />
            <Stack sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, wordBreak: 'break-word' }}>
                {`${offer.code} · ${t('mweb.venueFood.coupon.offerPct', { vars: { pct: String(offer.discount_pct) } })}`}
              </Typography>
              {offer.description && (
                <Typography variant="caption" sx={{ color: 'text.secondary', wordBreak: 'break-word' }}>
                  {offer.description}
                </Typography>
              )}
              {offer.min_order_amount > 0 && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {t('mweb.venueFood.coupon.offerMin', { vars: { amount: formatFoodMoney(offer.min_order_amount, currency) } })}
                </Typography>
              )}
              {offer.valid_until && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {t('mweb.venueFood.coupon.offerUntil', { vars: { date: formatDate(offer.valid_until) } })}
                </Typography>
              )}
            </Stack>
            <DuncitButton
              size="small"
              variant="outlined"
              disabled={disabled || coupon.checking}
              onClick={() => coupon.apply(offer.code)}
              aria-label={t('mweb.venueFood.coupon.offerApply', { vars: { code: offer.code } })}
              data-testid={`food-coupon-offer-apply-${offer.code}`}
            >
              {t('mweb.venueFood.coupon.apply')}
            </DuncitButton>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}
