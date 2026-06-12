import { Controller } from 'react-hook-form';
import { Autocomplete, Stack, TextField, Typography } from '@mui/material';
import PlaceIcon from '@mui/icons-material/Place';
import type { CreatePodForm, CreatePodLocation } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
  locations: CreatePodLocation[];
}

/** Step 1 — where the host wants to run the pod. The picked city drives which
 * clubs load on the next step. */
export default function LocationStep({ form, locations }: Readonly<Props>) {
  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} alignItems="center">
        <PlaceIcon color="primary" fontSize="small" />
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
          Pick the city you want to host in — clubs on the next step load for this location.
        </Typography>
      </Stack>
      <Controller
        control={form.control}
        name="location_id"
        render={({ field, fieldState }) => (
          <Autocomplete
            options={locations}
            getOptionLabel={(option) =>
              option.city && option.city !== option.location_name
                ? `${option.location_name} (${option.city})`
                : option.location_name
            }
            value={locations.find((location) => location.id === field.value) ?? null}
            onChange={(_e, next) => field.onChange(next?.id ?? '')}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Where do you want to host?"
                required
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
              />
            )}
          />
        )}
      />
    </Stack>
  );
}
