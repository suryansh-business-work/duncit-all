import { FormControlLabel, Grid, MenuItem, Stack, Switch, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { Controller, type Control } from 'react-hook-form';
import { useTranslation } from '@duncit/shell';
import { foodDietLabel, foodSpiceLabel } from '../../food-labels';
import GalleryField from './GalleryField';
import type { VenueRegistrationConfig } from '../queries';
import type { VenueFormValues } from '../types';

/**
 * One dish on the menu: what it is called, which heading it sits under, what it
 * costs, how it is cooked, whether the kitchen is serving it today, its photos.
 *
 * The food type and spice level come from the server's catalogue; only their
 * wording is ours (`food-labels`).
 */
export default function FoodMenuRow({
  control,
  index,
  config,
  onPick,
  onRemove,
}: Readonly<{
  control: Control<VenueFormValues>;
  index: number;
  config: VenueRegistrationConfig;
  onPick: () => Promise<string | null>;
  onRemove: () => void;
}>) {
  const { t } = useTranslation();
  const dishNumber = index + 1;

  return (
    <Stack
      component="li"
      spacing={1.5}
      sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          {t('directory.venueEditor.dishHeading', { vars: { number: dishNumber } })}
        </Typography>
        <DuncitIconButton
          aria-label={t('directory.venueEditor.removeDish', { vars: { number: dishNumber } })}
          onClick={onRemove}
        >
          <DeleteOutlineIcon fontSize="small" />
        </DuncitIconButton>
      </Stack>

      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, md: 6 }}>
          <RhfTextField
            control={control}
            name={`food_menu.${index}.name`}
            label={t('directory.venueEditor.dishName')}
            size="small"
            required
          />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <RhfTextField
            control={control}
            name={`food_menu.${index}.category`}
            label={t('directory.venueEditor.dishSection')}
            size="small"
            hint={t('directory.venueEditor.dishSectionHint')}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <RhfTextField
            control={control}
            name={`food_menu.${index}.price`}
            label={t('directory.venueEditor.dishPrice')}
            size="small"
            type="number"
            required
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <RhfTextField
            control={control}
            name={`food_menu.${index}.description`}
            label={t('directory.venueEditor.dishDescription')}
            size="small"
            multiline
            minRows={2}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <RhfTextField
            control={control}
            name={`food_menu.${index}.diet`}
            label={t('directory.venueEditor.dishDiet')}
            size="small"
            select
          >
            {config.food_diets.map((diet) => (
              <MenuItem key={diet} value={diet}>
                {foodDietLabel(t, diet)}
              </MenuItem>
            ))}
          </RhfTextField>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <RhfTextField
            control={control}
            name={`food_menu.${index}.spice_level`}
            label={t('directory.venueEditor.dishSpice')}
            size="small"
            select
          >
            {config.food_spice_levels.map((level) => (
              <MenuItem key={level} value={level}>
                {foodSpiceLabel(t, level)}
              </MenuItem>
            ))}
          </RhfTextField>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Controller
            control={control}
            name={`food_menu.${index}.is_available`}
            render={({ field }) => (
              <FormControlLabel
                control={<Switch checked={!!field.value} onChange={field.onChange} />}
                label={t('directory.venueEditor.dishAvailable')}
              />
            )}
          />
        </Grid>
      </Grid>

      <GalleryField
        control={control}
        name={`food_menu.${index}.images`}
        onPick={onPick}
        limit={config.food_image_limit}
        emptyText={t('directory.venueEditor.dishPhotosEmpty')}
        itemAlt={t('directory.venueEditor.dishPhotoAlt', { vars: { number: dishNumber } })}
      />
    </Stack>
  );
}
