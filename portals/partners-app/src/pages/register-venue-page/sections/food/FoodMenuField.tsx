import { useFieldArray, type UseFormReturn } from 'react-hook-form';
import { Alert, FormHelperText, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { RegisterVenueValues, VenueRegistrationConfig } from '../../register-venue';
import FoodMenuItemCard from './FoodMenuItemCard';

interface Props {
  form: UseFormReturn<RegisterVenueValues>;
  config: VenueRegistrationConfig;
}

/** The venue's food menu: one card per dish, up to the config's limit. */
export default function FoodMenuField({ form, config }: Readonly<Props>) {
  const { t } = useTranslation();
  const { control, formState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'food_menu' });
  const listError = formState.errors.food_menu?.root?.message ?? formState.errors.food_menu?.message;
  const atLimit = fields.length >= config.food_menu_limit;

  const addDish = () =>
    append({
      item_id: '',
      name: '',
      description: '',
      category: '',
      price: '',
      images: [],
      diet: config.food_diets[0] ?? '',
      spice_level: config.food_spice_levels[0] ?? '',
      is_available: true,
    });

  return (
    <Stack spacing={1.5}>
      <Stack spacing={0.5}>
        <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 800 }}>
          {t('partners.registerVenuePage.foodMenu')}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('partners.registerVenuePage.foodMenuHint')}
        </Typography>
      </Stack>
      {typeof listError === 'string' && listError && <FormHelperText error>{listError}</FormHelperText>}
      {fields.map((row, index) => (
        <FoodMenuItemCard key={row.id} form={form} index={index} config={config} onRemove={() => remove(index)} />
      ))}
      {atLimit && (
        <Alert severity="info">
          {t('partners.registerVenuePage.foodMenuLimit', { vars: { max: config.food_menu_limit } })}
        </Alert>
      )}
      <DuncitButton
        startIcon={<AddIcon />}
        disabled={atLimit}
        onClick={addDish}
        sx={{ alignSelf: 'flex-start' }}
        data-testid="register-venue-food-add"
      >
        {t('partners.registerVenuePage.foodAddMenuItem')}
      </DuncitButton>
    </Stack>
  );
}
