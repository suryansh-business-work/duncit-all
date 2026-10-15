import { useState } from 'react';
import { Box, ButtonBase, Chip, Stack, Typography } from '@mui/material';
import RestaurantIcon from '@mui/icons-material/RestaurantRounded';
import { CartControlNoticeChip, CartQuantityControl, useCartControlNotice } from '@duncit/ui';
import { FOOD_ORDER_LIMITS, type VenueFoodItem } from '@duncit/utils';
import { useCartControlLabels } from '../../components/cart/useCartControlLabels';
import MomentLightbox from '../../components/moments/MomentLightbox';
import { usePricing } from '../../hooks/usePricing';
import { useTranslation } from '../../i18n/useTranslation';
import { RADIUS, SURFACE_SX } from '../../theme';
import DietMark from '../VenueDetailsPage/food/DietMark';
import FoodItemPrice from '../VenueDetailsPage/food/FoodItemPrice';
import FoodItemVideos from '../VenueDetailsPage/food/FoodItemVideos';
import FoodRatingBadge from '../VenueDetailsPage/food/FoodRatingBadge';
import SpiceMark from '../VenueDetailsPage/food/SpiceMark';
import { useFoodCart } from '../VenueDetailsPage/food/useFoodCart';
import type { PublicVenue } from '../VenueDetailsPage/queries';

interface Props {
  venue: PublicVenue;
  item: VenueFoodItem;
}

const PHOTO_SX = { width: '100%', aspectRatio: '4 / 3', borderRadius: `${RADIUS.base}px`, overflow: 'hidden', bgcolor: 'action.hover' } as const;
const THUMB_SX = { width: 64, height: 64, flex: '0 0 auto', borderRadius: `${RADIUS.base}px`, overflow: 'hidden' } as const;

/**
 * A dish's own page: its photos (each opens the viewer), diet and heat marks,
 * name, price and description, the venue's food rating, and — when the venue
 * takes QR orders — the same cart control the menu card has, on the same cart
 * (kept per venue on this device, so the menu shows what was added here).
 * Native twin: screens/VenueFoodItemScreen.
 */
export default function FoodItemDetails({ venue, item }: Readonly<Props>) {
  const { t } = useTranslation();
  const { currency } = usePricing();
  const cart = useFoodCart(venue.id, venue.food_menu, venue.food_ordering.discount_pct, venue.food_ordering);
  const labels = useCartControlLabels()(item.name);
  const quantity = cart.quantityOf(item.id);
  const notice = useCartControlNotice(quantity);
  const [zoom, setZoom] = useState<number | null>(null);
  const canOrder = venue.food_ordering.enabled && item.is_available;
  const [cover] = item.images;

  return (
    <Stack spacing={2} data-testid={`food-item-details-${item.id}`}>
      {cover ? (
        <ButtonBase focusRipple onClick={() => setZoom(0)} aria-label={t('mweb.venueFood.viewImage', { vars: { name: item.name } })} sx={PHOTO_SX}>
          <Box component="img" src={cover} alt={item.name} sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </ButtonBase>
      ) : (
        <Box aria-hidden sx={{ ...PHOTO_SX, display: 'grid', placeItems: 'center', color: 'text.disabled' }}>
          <RestaurantIcon fontSize="large" />
        </Box>
      )}
      {item.images.length > 1 && (
        <Stack direction="row" spacing={1} sx={{ overflowX: 'auto' }} data-testid="food-item-thumbs">
          {item.images.map((src, index) => (
            <ButtonBase
              key={src}
              focusRipple
              onClick={() => setZoom(index)}
              aria-label={t('mweb.venueFood.viewImage', { vars: { name: item.name } })}
              sx={THUMB_SX}
            >
              <Box component="img" src={src} alt="" loading="lazy" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </ButtonBase>
          ))}
        </Stack>
      )}
      <Stack spacing={1} sx={{ ...SURFACE_SX, p: 2, position: 'relative' }}>
        <CartControlNoticeChip notice={notice} labels={labels} testId={`food-item-details-${item.id}-notice`} />
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
          <DietMark diet={item.diet} />
          <SpiceMark level={item.spice_level} />
        </Stack>
        <Typography component="h2" sx={{ fontSize: '1.25rem', fontWeight: 700, wordBreak: 'break-word' }}>
          {item.name}
        </Typography>
        <FoodRatingBadge venueId={venue.id} />
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <FoodItemPrice item={item} currency={currency} />
          {canOrder && (
            <CartQuantityControl
              quantity={quantity}
              max={FOOD_ORDER_LIMITS.maxQuantity}
              labels={labels}
              onChange={(next) => cart.setQuantity(item.id, next)}
              testIdPrefix={`food-item-details-${item.id}`}
            />
          )}
        </Stack>
        {!item.is_available && (
          <Chip size="small" label={t('mweb.venueFood.unavailable')} sx={{ alignSelf: 'flex-start', fontWeight: 600 }} data-testid="food-item-details-unavailable" />
        )}
        {item.description && (
          <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-line', wordBreak: 'break-word' }}>
            {item.description}
          </Typography>
        )}
        <FoodItemVideos item={item} />
      </Stack>
      <MomentLightbox
        moments={item.images.map((url) => ({ url }))}
        index={zoom}
        onClose={() => setZoom(null)}
        onIndexChange={setZoom}
      />
    </Stack>
  );
}
