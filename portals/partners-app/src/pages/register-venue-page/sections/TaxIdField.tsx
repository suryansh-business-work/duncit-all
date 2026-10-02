import { Controller, type UseFormReturn } from 'react-hook-form';
import { FormControlLabel, FormHelperText, Stack, Switch, TextField } from '@mui/material';
import type { RegisterVenueValues } from '../register-venue';

interface Props {
  form: UseFormReturn<RegisterVenueValues>;
  /** The switch saying whether the venue has this number at all. */
  toggleName: 'has_gstin' | 'has_pan';
  name: 'gstin' | 'pan';
  label: string;
  toggleLabel: string;
  toggleHint: string;
  /** Format hint shown under the field while it is editable. */
  hint: string;
  locked: boolean;
  lockedHint: string;
}

/**
 * An optional tax id: a switch, and the number only while the switch is on.
 * Turning it off clears nothing in the form, but the mappers send a blank, so
 * a venue without the number is saved as having none.
 */
export default function TaxIdField({
  form,
  toggleName,
  name,
  label,
  toggleLabel,
  toggleHint,
  hint,
  locked,
  lockedHint,
}: Readonly<Props>) {
  const { control, watch } = form;
  const has = watch(toggleName);
  const hintId = `${toggleName}-hint`;

  return (
    <Stack spacing={1}>
      <Controller
        name={toggleName}
        control={control}
        render={({ field }) => (
          <FormControlLabel
            control={
              <Switch
                checked={field.value}
                onChange={(_, checked) => field.onChange(checked)}
                onBlur={field.onBlur}
                disabled={locked}
                slotProps={{ input: { 'aria-describedby': hintId } }}
                data-testid={`register-venue-${toggleName}`}
              />
            }
            label={toggleLabel}
          />
        )}
      />
      <FormHelperText id={hintId} sx={{ mt: 0 }}>
        {toggleHint}
      </FormHelperText>
      {has && (
        <Controller
          name={name}
          control={control}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              label={label}
              required
              disabled={locked}
              error={Boolean(fieldState.error)}
              helperText={fieldState.error?.message ?? (locked ? lockedHint : hint)}
            />
          )}
        />
      )}
    </Stack>
  );
}
