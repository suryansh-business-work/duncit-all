import type { Control } from 'react-hook-form';
import { Grid, MenuItem, Stack, Typography } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { HelpTip } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import { PRICE_FILTERS, PRICE_FILTER_LABEL, SETTINGS_LIMITS } from '../copy';
import MultiPickField from './MultiPickField';
import type { PromoSettingsFormValues, PromoSettingsOptions } from './promo-settings.types';

interface Props {
  control: Control<PromoSettingsFormValues>;
  options: PromoSettingsOptions;
  disabled: boolean;
}

/** Which pods are promoted: by city, club, category, price, and how far off they are. */
export default function AudienceFields({ control, options, disabled }: Readonly<Props>) {
  const { t } = useTranslation();
  const { min_days_until_start } = SETTINGS_LIMITS;
  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ alignItems: 'center' }}>
        <Typography variant="subtitle2" component="h3">
          {t('marketing.podPromo.filtersTitle')}
        </Typography>
        <HelpTip title={t('marketing.podPromo.filtersHelp')} />
      </Stack>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <MultiPickField control={control} name="city_ids" label={t('marketing.podPromo.cities')} hint={t('marketing.podPromo.citiesHint')} options={options.cities} disabled={disabled} testId="promo-cities" />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <MultiPickField control={control} name="club_ids" label={t('marketing.podPromo.clubs')} hint={t('marketing.podPromo.clubsHint')} options={options.clubs} disabled={disabled} testId="promo-clubs" />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <MultiPickField
            control={control}
            name="category_ids"
            label={t('marketing.podPromo.categories')}
            hint={t('marketing.podPromo.categoriesHint')}
            options={options.categories}
            disabled={disabled}
            testId="promo-categories"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <RhfTextField control={control} name="price_filter" select label={t('marketing.podPromo.priceFilter')} hint={t('marketing.podPromo.priceFilterHint')} disabled={disabled} data-testid="promo-price-filter">
            {PRICE_FILTERS.map((price) => (
              <MenuItem key={price} value={price}>
                {t(PRICE_FILTER_LABEL[price])}
              </MenuItem>
            ))}
          </RhfTextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <RhfTextField
            control={control}
            name="min_days_until_start"
            type="number"
            label={t('marketing.podPromo.minDays')}
            hint={t('marketing.podPromo.minDaysHint')}
            disabled={disabled}
            slotProps={{ htmlInput: { min: min_days_until_start.min, max: min_days_until_start.max, step: 1 } }}
            data-testid="promo-min-days"
          />
        </Grid>
      </Grid>
    </Stack>
  );
}
