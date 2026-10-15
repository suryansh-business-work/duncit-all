import { useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import { Stack, Typography } from '@mui/material';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import { logs } from '@duncit/logs';
import { formatFoodRating, hasFoodRating } from '@duncit/utils';
import { useTranslation } from '../../../i18n/useTranslation';
import { VENUE_FOOD_RATING, type VenueFoodRatingData } from './queries';

/**
 * The venue's food rating — "★ 4.3 (12)" — beside the menu's title and on a
 * dish's page. Guests rate the order, not each dish, so it is the venue's
 * number in both places. Nothing shows until somebody has rated, or while the
 * rating cannot be read: it is a nicety, never in the way of the menu.
 * Native twin: components/details/venue-food/FoodRatingBadge.
 */
export default function FoodRatingBadge({ venueId }: Readonly<{ venueId: string }>) {
  const { t } = useTranslation();
  const { data, error } = useQuery<VenueFoodRatingData>(VENUE_FOOD_RATING, {
    variables: { venueId },
    skip: !venueId,
  });

  useEffect(() => {
    if (error) logs.mWeb.warn('venueFood', 'rating', { error, venueId });
  }, [error, venueId]);

  const rating = data?.venueFoodRating;
  if (!hasFoodRating(rating)) return null;
  const average = formatFoodRating(rating.average);
  const count = String(rating.count);

  return (
    <Stack
      direction="row"
      spacing={0.5}
      role="img"
      aria-label={t('mweb.venueFood.rating.label', { vars: { average, count } })}
      sx={{ alignItems: 'center' }}
      data-testid="venue-food-rating"
    >
      <StarRoundedIcon fontSize="small" sx={{ color: 'warning.main' }} aria-hidden />
      <Typography aria-hidden variant="body2" sx={{ fontWeight: 600 }}>
        {t('mweb.venueFood.rating.summary', { vars: { average, count } })}
      </Typography>
    </Stack>
  );
}
