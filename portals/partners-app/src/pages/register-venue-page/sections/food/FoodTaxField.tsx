import type { UseFormReturn } from 'react-hook-form';
import { Stack, Typography } from '@mui/material';
import { FoodTaxFields } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import type { RegisterVenueValues } from '../../register-venue';

interface Props {
  form: UseFormReturn<RegisterVenueValues>;
}

/**
 * GST on the venue's QR orders. Off, the venue follows Duncit Finance's
 * default — shown read-only, as the server resolved it. On, the owner's own
 * mode and percent price every order. The controls and their rules are the
 * shared ones the Venues console uses too (`@duncit/forms`); the server checks
 * them again.
 */
export default function FoodTaxField({ form }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Stack spacing={1.5}>
      <Stack spacing={0.5}>
        <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 800 }}>
          {t('partners.registerVenuePage.foodTaxTitle')}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('partners.registerVenuePage.foodTaxIntro')}
        </Typography>
      </Stack>
      <FoodTaxFields control={form.control} t={t} prefix="food_ordering" idPrefix="register-venue-food" />
    </Stack>
  );
}
