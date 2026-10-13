import { Avatar, Box, Chip, Stack, Typography } from '@mui/material';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import { InfoRow } from '@duncit/ui';
import { formatMoney } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import SectionCard from './SectionCard';
import { foodDietLabel, foodSpiceLabel } from '../food-labels';
import type { AdminVenueDetail, VenueFoodItem } from './queries';

type Translate = ReturnType<typeof useTranslation>['t'];

/** Paise are shown only when a price actually has them. */
const dishPrice = (price: number) =>
  formatMoney(price, { decimals: Number.isInteger(price) ? 0 : 2 });

/** Section, food type and spice level on one line — a blank section is skipped. */
const dishFacts = (t: Translate, dish: VenueFoodItem) =>
  [dish.category, foodDietLabel(t, dish.diet), foodSpiceLabel(t, dish.spice_level)]
    .filter(Boolean)
    .join(' · ');

function DishRow({ dish }: Readonly<{ dish: VenueFoodItem }>) {
  const { t } = useTranslation();

  return (
    <Stack component="li" direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
      <Avatar variant="rounded" src={dish.images[0]} alt="">
        <RestaurantIcon fontSize="small" />
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {dish.name}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
          {dishFacts(t, dish)}
        </Typography>
      </Box>
      <Chip
        size="small"
        variant="outlined"
        color={dish.is_available ? 'success' : 'default'}
        label={
          dish.is_available
            ? t('directory.venueFood.available')
            : t('directory.venueFood.unavailable')
        }
      />
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {dishPrice(dish.price)}
      </Typography>
    </Stack>
  );
}

/**
 * The venue's food side, read-only: whether it serves food, whether guests may
 * order by scanning its QR and at what discount, and the menu itself.
 *
 * Ordering is shown but never edited from a console — the Razorpay account it
 * charges is the owner's, linked in the Partners portal.
 */
export default function VenueFoodCard({ venue }: Readonly<{ venue: AdminVenueDetail }>) {
  const { t } = useTranslation();
  const menu = venue.food_menu ?? [];
  const title = t('directory.venueFood.title');

  if (!venue.offers_food) {
    return (
      <SectionCard icon={<RestaurantIcon color="primary" />} title={title}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('directory.venueFood.notOffered')}
        </Typography>
      </SectionCard>
    );
  }

  const ordering = venue.food_ordering;
  return (
    <SectionCard icon={<RestaurantIcon color="primary" />} title={title}>
      <Stack spacing={1.5}>
        <InfoRow label={t('directory.venueFood.offersFood')} value={t('directory.venueFood.yes')} />
        <InfoRow
          label={t('directory.venueFood.qrOrdering')}
          value={
            ordering?.enabled
              ? t('directory.venueFood.orderingOn')
              : t('directory.venueFood.orderingOff')
          }
        />
        <InfoRow
          label={t('directory.venueFood.discount')}
          value={t('directory.venueFood.discountValue', {
            vars: { pct: ordering?.discount_pct ?? 0 },
          })}
        />

        <Box>
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', fontWeight: 700, display: 'block' }}
          >
            {t('directory.venueFood.menu')}
          </Typography>
          {menu.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('directory.venueFood.noMenu')}
            </Typography>
          ) : (
            <Stack
              component="ul"
              spacing={1}
              aria-label={t('directory.venueFood.menu')}
              sx={{ listStyle: 'none', m: 0, mt: 0.5, p: 0 }}
            >
              {menu.map((dish) => (
                <DishRow key={dish.id} dish={dish} />
              ))}
            </Stack>
          )}
        </Box>
      </Stack>
    </SectionCard>
  );
}
