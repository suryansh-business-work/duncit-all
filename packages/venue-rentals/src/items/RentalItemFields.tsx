import { Controller, useWatch, type Control } from 'react-hook-form';
import { Card, CardContent, FormControlLabel, MenuItem, Stack, Switch, Typography } from '@mui/material';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { useTranslation } from '@duncit/app-settings';
import { DuncitIconButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { FoodDishPhotos, type FoodPhotoUpload } from '@duncit/venue-food';
import type { RentalItemsConfig, RentalItemsValues } from '@duncit/utils';
import type { RentalItemsOutput } from './rental-items.schema';

interface Props {
  control: Control<RentalItemsValues, unknown, RentalItemsOutput>;
  index: number;
  config: RentalItemsConfig;
  upload: FoodPhotoUpload;
  idPrefix: string;
  onRemove: () => void;
}

/** One rented item: what it is, how it is charged, its deposit and how many there are. */
export default function RentalItemFields({ control, index, config, upload, idPrefix, onRemove }: Readonly<Props>) {
  const { t } = useTranslation();
  const name = useWatch({ control, name: `items.${index}.name` });
  const title = name.trim() || t('venueRentals.items.itemTitle', { vars: { n: index + 1 } });
  const field = (key: string) => `${idPrefix}-item-${index}-${key}`;

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }} data-testid={field('card')}>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 700 }}>
              {title}
            </Typography>
            <DuncitIconButton aria-label={t('venueRentals.items.remove', { vars: { name: title } })} onClick={onRemove}>
              <DeleteOutlinedIcon />
            </DuncitIconButton>
          </Stack>
          <RhfTextField control={control} name={`items.${index}.name`} label={t('venueRentals.items.name')} data-testid={field('name')} />
          <RhfTextField
            control={control}
            name={`items.${index}.description`}
            label={t('venueRentals.items.description')}
            multiline
            minRows={2}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <RhfTextField control={control} name={`items.${index}.unit`} label={t('venueRentals.items.unit')} select>
              {config.rental_units.map((unit) => (
                <MenuItem key={unit} value={unit}>
                  {t(unit === 'HOUR' ? 'venueRentals.items.unitHour' : 'venueRentals.items.unitSlot')}
                </MenuItem>
              ))}
            </RhfTextField>
            <RhfTextField
              control={control}
              name={`items.${index}.rate`}
              label={t('venueRentals.items.rate')}
              type="number"
              slotProps={{ htmlInput: { min: 1, max: config.rental_rate_max, step: 1 } }}
              data-testid={field('rate')}
            />
            <RhfTextField
              control={control}
              name={`items.${index}.deposit`}
              label={t('venueRentals.items.deposit')}
              hint={t('venueRentals.items.depositHint')}
              type="number"
              slotProps={{ htmlInput: { min: 0, max: config.rental_deposit_max, step: 1 } }}
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <RhfTextField
              control={control}
              name={`items.${index}.stock`}
              label={t('venueRentals.items.stock')}
              type="number"
              slotProps={{ htmlInput: { min: 1, max: config.rental_stock_max, step: 1 } }}
            />
            <RhfTextField
              control={control}
              name={`items.${index}.per_guest_limit`}
              label={t('venueRentals.items.perGuest')}
              type="number"
              slotProps={{ htmlInput: { min: 1, max: config.rental_per_guest_max, step: 1 } }}
            />
          </Stack>
          <Controller
            control={control}
            name={`items.${index}.images`}
            render={({ field: images, fieldState }) => (
              <FoodDishPhotos
                images={images.value}
                limit={config.rental_image_limit}
                dishName={title}
                error={fieldState.error?.message}
                onChange={images.onChange}
                venueId={upload.venueId}
                surface={upload.surface}
              />
            )}
          />
          <Controller
            control={control}
            name={`items.${index}.is_available`}
            render={({ field: available }) => (
              <FormControlLabel
                control={<Switch checked={available.value} onChange={(_e, checked) => available.onChange(checked)} />}
                label={t('venueRentals.items.available')}
              />
            )}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
