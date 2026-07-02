import { Controller, useFieldArray, type UseFormReturn } from 'react-hook-form';
import {
  Alert,
  Button,
  Chip,
  FormHelperText,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import type { RegisterVenueMode, RegisterVenueValues, VenueRegistrationConfig } from '../register-venue';

interface Props {
  form: UseFormReturn<RegisterVenueValues>;
  config: VenueRegistrationConfig;
  mode: RegisterVenueMode;
}

/** Venue type + the dynamic capacity list under it: each row names one space
 * ("Banquet hall", "Rooftop tables") with its own capacity number. The
 * capacity list stays editable after approval; the venue type is locked. */
export default function VenueTypeCapacitySection({ form, config, mode }: Readonly<Props>) {
  const { control, watch, formState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'capacity_items' });
  const items = watch('capacity_items');
  const total = items.reduce((sum, item) => sum + (Number(item.capacity) || 0), 0);
  const listError = formState.errors.capacity_items?.root?.message ?? formState.errors.capacity_items?.message;
  const atLimit = fields.length >= config.capacity_item_limit;
  const typeLocked = mode === 'edit-approved';

  return (
    <Stack spacing={2.5}>
      <Controller
        name="venue_type"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            select
            label="Venue type"
            required
            disabled={typeLocked}
            error={Boolean(fieldState.error)}
            helperText={fieldState.error?.message ?? (typeLocked ? 'Locked after approval' : 'Closest match for your space')}
          >
            {config.venue_types.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </TextField>
        )}
      />
      <Stack spacing={0.5}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle2" fontWeight={800}>
            Capacity{' '}
            <Typography component="span" variant="caption" color="error.main" fontWeight={800}>
              (required)
            </Typography>
          </Typography>
          {total > 0 && <Chip size="small" label={`Total: ${total}`} color="primary" variant="outlined" />}
        </Stack>
        <Typography variant="caption" color="text.secondary">
          List each space or unit with its own capacity — e.g. "Banquet hall" 120, "Rooftop tables" 40.
        </Typography>
      </Stack>
      {typeof listError === 'string' && listError && <FormHelperText error>{listError}</FormHelperText>}
      {fields.map((row, index) => (
        <Stack key={row.id} direction="row" spacing={1} alignItems="flex-start">
          <Controller
            name={`capacity_items.${index}.label`}
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="What is this capacity for?"
                size="small"
                fullWidth
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message ?? 'e.g. Banquet hall, Rooftop tables'}
              />
            )}
          />
          <Controller
            name={`capacity_items.${index}.capacity`}
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                type="number"
                label="Capacity"
                size="small"
                sx={{ minWidth: 130 }}
                inputProps={{ min: 1, step: 1 }}
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message ?? 'People it holds'}
              />
            )}
          />
          <IconButton size="small" aria-label="Remove capacity entry" onClick={() => remove(index)}>
            <DeleteIcon />
          </IconButton>
        </Stack>
      ))}
      {atLimit && (
        <Alert severity="info">At most {config.capacity_item_limit} capacity entries are allowed.</Alert>
      )}
      <Button
        startIcon={<AddIcon />}
        disabled={atLimit}
        onClick={() => append({ label: '', capacity: '' })}
        sx={{ alignSelf: 'flex-start' }}
      >
        Add capacity entry
      </Button>
    </Stack>
  );
}
