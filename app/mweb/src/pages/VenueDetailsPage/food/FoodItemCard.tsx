import { Link as RouterLink } from 'react-router';
import { Box, Chip, Link, Stack, Typography } from '@mui/material';
import RestaurantIcon from '@mui/icons-material/RestaurantRounded';
import { CartControlNoticeChip, CartQuantityControl, useCartControlNotice } from '@duncit/ui';
import { FOOD_ORDER_LIMITS, type VenueFoodItem } from '@duncit/utils';
import { useCartControlLabels } from '../../../components/cart/useCartControlLabels';
import { useTranslation } from '../../../i18n/useTranslation';
import { RADIUS, SURFACE_SX } from '../../../theme';
import DietMark from './DietMark';
import FoodItemPrice from './FoodItemPrice';
import FoodItemVideos from './FoodItemVideos';
import SpiceMark from './SpiceMark';

interface Props {
  item: VenueFoodItem;
  currency: string;
  /** The venue takes QR orders right now — without it the card is a menu entry only. */
  canOrder: boolean;
  quantity: number;
  onQuantity: (itemId: string, quantity: number) => void;
  /** The dish's own page — its name links there, stretched over the card. */
  detailsPath?: string;
}

const THUMB_SX = {
  width: 96,
  height: 96,
  flex: '0 0 auto',
  borderRadius: `${RADIUS.base}px`,
  overflow: 'hidden',
  bgcolor: 'action.hover',
} as const;

/** Lifts a control above the card's stretched link, so it keeps its own clicks. */
const ABOVE_LINK_SX = { position: 'relative', zIndex: 1 } as const;

/**
 * The dish's name as a link to its page, stretched over the whole card — the
 * photo and any blank space open the dish too, with one link for a screen reader.
 */
const STRETCHED_LINK_SX = {
  '&::after': { content: '""', position: 'absolute', inset: 0, borderRadius: 'inherit' },
} as const;

/**
 * The dish's first photo, or a plain mark when it has none. It is a picture,
 * not a control: the card's stretched link opens the dish, whose page holds
 * every photo and the viewer.
 */
function Thumb({ item }: Readonly<Pick<Props, 'item'>>) {
  const src = item.images[0];
  if (!src) {
    return (
      <Box aria-hidden sx={{ ...THUMB_SX, display: 'grid', placeItems: 'center', color: 'text.disabled' }}>
        <RestaurantIcon />
      </Box>
    );
  }
  return (
    <Box sx={THUMB_SX} data-testid={`food-item-image-${item.id}`}>
      <Box component="img" src={src} alt={item.name} loading="lazy" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    </Box>
  );
}

/**
 * One dish — the whole card opens the dish's own page when it has one: its
 * diet and heat marks, name, price and description on the left,
 * its photo on the right, and — when the venue takes QR orders — the cart
 * control under the photo: a "+" that becomes the remove / count / add pill.
 * The "Item added" / "Item removed" notice lies on the card, the photo being
 * too small to hold it. A dish that is off for now stays on the menu, greyed
 * and labelled, and cannot be added.
 */
export default function FoodItemCard({ item, currency, canOrder, quantity, onQuantity, detailsPath }: Readonly<Props>) {
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
          {detailsPath ? (
            <Link
              component={RouterLink}
              to={detailsPath}
              color="inherit"
              underline="hover"
              sx={STRETCHED_LINK_SX}
              data-testid={`food-item-open-${item.id}`}
            >
              {item.name}
            </Link>
          ) : (
            item.name
          )}
        </Typography>
        <FoodItemPrice item={item} currency={currency} dim={dim} />
        {item.description && (
          <Typography variant="body2" sx={{ color: 'text.secondary', wordBreak: 'break-word', ...dim }}>
            {item.description}
          </Typography>
        )}
        <Box sx={ABOVE_LINK_SX}>
          <FoodItemVideos item={item} />
        </Box>
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
        {/* Under the stretched link a dimmed photo would still catch the click, so it lets it through. */}
        <Box sx={{ ...dim, pointerEvents: 'none' }}>
          <Thumb item={item} />
        </Box>
        {canOrder && available && (
          <Box sx={ABOVE_LINK_SX}>
            <CartQuantityControl
              size="small"
              quantity={quantity}
              max={FOOD_ORDER_LIMITS.maxQuantity}
              labels={labels}
              onChange={(next) => onQuantity(item.id, next)}
              testIdPrefix={`food-item-${item.id}`}
            />
          </Box>
        )}
      </Stack>
    </Stack>
  );
}
