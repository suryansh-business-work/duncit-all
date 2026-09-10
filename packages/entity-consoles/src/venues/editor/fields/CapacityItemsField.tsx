import { Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useFieldArray, type Control } from 'react-hook-form';
import { useTranslation } from '@duncit/shell';
import type { VenueFormValues } from '../types';

/**
 * The venue's named spaces and what each one seats.
 *
 * The scalar `capacity` stays the total, so the breakdown is what an operator
 * actually books against ("Rooftop 40, Basement 120") rather than a second
 * number to keep in step by hand.
 */
export default function CapacityItemsField({
  control,
  limit,
}: Readonly<{ control: Control<VenueFormValues>; limit: number }>) {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({ control, name: 'capacity_items' });

  return (
    <Stack spacing={1}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t('directory.venueEditor.capacityItemsHint')}
      </Typography>
      {fields.map((row, index) => (
        <Stack key={row.id} direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
          <RhfTextField
            control={control}
            name={`capacity_items.${index}.label`}
            label={t('directory.venueEditor.spaceName')}
            size="small"
          />
          <RhfTextField
            control={control}
            name={`capacity_items.${index}.capacity`}
            label={t('directory.venueEditor.seats')}
            size="small"
            type="number"
            sx={{ maxWidth: 140 }}
          />
          <DuncitIconButton
            aria-label={t('directory.venueEditor.removeSpace')}
            onClick={() => remove(index)}
            sx={{ mt: 0.5 }}
          >
            <DeleteOutlineIcon fontSize="small" />
          </DuncitIconButton>
        </Stack>
      ))}
      <DuncitButton
        startIcon={<AddIcon />}
        disabled={fields.length >= limit}
        onClick={() => append({ label: '', capacity: 1 })}
        sx={{ alignSelf: 'flex-start' }}
      >
        {t('directory.venueEditor.addSpace')}
      </DuncitButton>
    </Stack>
  );
}
