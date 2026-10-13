import { Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { useFieldArray, type Control } from 'react-hook-form';
import { useTranslation } from '@duncit/shell';
import FoodMenuRow from './FoodMenuRow';
import type { VenueRegistrationConfig } from '../queries';
import type { VenueFormValues } from '../types';

/**
 * The venue's food menu, one dish per row.
 *
 * Admin edits REPLACE the menu, so a dish removed here is removed — while one
 * left in place goes back under the id it came with and stays the same dish to
 * every order that already names it. What a guest pays with is not here at all:
 * QR ordering and its Razorpay account are the owner's, in the Partners portal.
 */
export default function FoodMenuField({
  control,
  config,
  onPick,
}: Readonly<{
  control: Control<VenueFormValues>;
  config: VenueRegistrationConfig;
  onPick: () => Promise<string | null>;
}>) {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({ control, name: 'food_menu' });

  return (
    <Stack spacing={1}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t('directory.venueEditor.foodMenuHint')}
      </Typography>
      {fields.length > 0 && (
        <Stack
          component="ul"
          spacing={1}
          aria-label={t('directory.venueEditor.foodMenu')}
          sx={{ listStyle: 'none', m: 0, p: 0 }}
        >
          {fields.map((row, index) => (
            <FoodMenuRow
              key={row.id}
              control={control}
              index={index}
              config={config}
              onPick={onPick}
              onRemove={() => remove(index)}
            />
          ))}
        </Stack>
      )}
      <DuncitButton
        startIcon={<AddIcon />}
        disabled={fields.length >= config.food_menu_limit}
        onClick={() =>
          append({
            item_id: '',
            name: '',
            description: '',
            category: '',
            price: 0,
            images: [],
            // The catalogue's first entry is the server's own default for each.
            diet: config.food_diets[0] ?? '',
            spice_level: config.food_spice_levels[0] ?? '',
            is_available: true,
          })
        }
        sx={{ alignSelf: 'flex-start' }}
      >
        {t('directory.venueEditor.addDish')}
      </DuncitButton>
    </Stack>
  );
}
