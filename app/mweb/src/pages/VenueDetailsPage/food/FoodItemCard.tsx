import { Box, ButtonBase, Chip, Stack, Typography } from '@mui/material';
import RestaurantIcon from '@mui/icons-material/RestaurantRounded';
import { CartControlNoticeChip, CartQuantityControl, useCartControlNotice } from '@duncit/ui';
import { FOOD_ORDER_LIMITS, formatFoodMoney, type VenueFoodItem } from '@duncit/utils';
import { useCartControlLabels } from '../../../components/cart/useCartControlLabels';
import { useTranslation } from '../../../i18n/useTranslation';
import { RADIUS, SURFACE_SX } from '../../../theme';
import DietMark from './DietMark';
import SpiceMark from './SpiceMark';

interface Props {
  item: VenueFoodItem;
  currency: string;
  /** The venue takes QR orders right now — without it the card is a menu entry only. */
  canOrder: boolean;
  quantity: number;
  onQuantity: (itemId: string, quantity: number) => void;
  onOpenImage: (item: VenueFoodItem) => void;
}

const THUMB_SX = {
  width: 96,
  height: 96,
  flex: '0 0 auto',
  borderRadius: `${RADIUS.base}px`,
  overflow: 'hidden',
  bgcolor: 'action.hover',
} as const;

/** The dish's first photo — a button into the image viewer — or a plain mark when it has none. */
function Thumb({ item, onOpenImage }: Readonly<Pick<Props, 'item' | 'onOpenImage'>>) {
  const { t } = useTranslation();
  const src = item.images[0];
  if (!src) {
    return (
      <Box aria-hidden sx={{ ...THUMB_SX, display: 'grid', placeItems: 'center', color: 'text.disabled' }}>
        <RestaurantIcon />
      </Box>
    );
  }
  return (
    <ButtonBase
      focusRipple
      onClick={() => onOpenImage(item)}
      aria-label={t('mweb.venueFood.viewImage', { vars: { name: item.name } })}
      sx={THUMB_SX}
      data-testid={`food-item-image-${item.id}`}
    >
      <Box
        component="img"
        src={src}
        alt={item.name}
        loading="lazy"
        sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    </ButtonBase>
  );
}

/**
 * One dish: its diet and heat marks, name, price and description on the left,
 * its photo on the right, and — when the venue takes QR orders — the cart
 * control under the photo: a "+" that becomes the remove / count / add pill.
 * The "Item added" / "Item removed" notice lies on the card, the photo being
 * too small to hold it. A dish that is off for now stays on the menu, greyed
 * and labelled, and cannot be added.
 */
export default function FoodItemCard({ item, currency, canOrder, quantity, onQuantity, onOpenImage }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = useCartControlLabels()(item.name);
  // The cart is read from storage before the first render, so a dish already
  // in it mounts with its quantity and raises no notice.
  const notice = useCartControlNotice(quantity);
  const available = item.is_available;
  const dim = available ? undefined : { opacity: 0.55 };

  return (
    <Stack
      component="li"
      direction="row"
      spacing={1.5}
      sx={{ ...SURFACE_SX, position: 'relative', p: 1.5, alignItems: 'flex-start' }}
      data-testid={`food-item-${item.id}`}
    >
      <CartControlNoticeChip notice={notice} labels={labels} testId={`food-item-${item.id}-notice`} />
      <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', ...dim }}>
          <DietMark diet={item.diet} />
          <SpiceMark level={item.spice_level} />
        </Stack>
        <Typography component="h4" sx={{ fontSize: '0.9375rem', fontWeight: 600, wordBreak: 'break-word', ...dim }}>
          {item.name}
        </Typography>
        <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, ...dim }}>
          {formatFoodMoney(item.price, currency)}
        </Typography>
        {item.description && (
          <Typography variant="body2" sx={{ color: 'text.secondary', wordBreak: 'break-word', ...dim }}>
            {item.description}
          </Typography>
        )}
        {!available && (
          <Chip
            size="small"
            label={t('mweb.venueFood.unavailable')}
            sx={{ alignSelf: 'flex-start', fontWeight: 600 }}
            data-testid={`food-item-unavailable-${item.id}`}
          />
        )}
      </Stack>
      <Stack spacing={1} sx={{ alignItems: 'center', flex: '0 0 auto' }}>
        <Box sx={dim}>
          <Thumb item={item} onOpenImage={onOpenImage} />
        </Box>
        {canOrder && available && (
          <CartQuantityControl
            size="small"
            quantity={quantity}
            max={FOOD_ORDER_LIMITS.maxQuantity}
            labels={labels}
            onChange={(next) => onQuantity(item.id, next)}
            testIdPrefix={`food-item-${item.id}`}
          />
        )}
      </Stack>
    </Stack>
  );
}
