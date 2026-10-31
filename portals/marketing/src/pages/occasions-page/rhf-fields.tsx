import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { FormControlLabel, FormHelperText, Stack, Switch } from '@mui/material';
import DateTimeField from '../../components/DateTimeField';
import MediaPickerField from '../../components/MediaPickerField';

/**
 * The three field kinds the Occasions editors share that `@duncit/forms` has
 * no RHF wrapper for: a date-time, an uploaded image and an on/off switch.
 */

interface FieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  hint?: string;
}

export function RhfDateTime<T extends FieldValues>({ control, name, label, hint, required }: Readonly<FieldProps<T> & { required?: boolean }>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange }, fieldState }) => (
        <DateTimeField
          label={label}
          value={String(value ?? '')}
          onChange={onChange}
          required={required}
          error={!!fieldState.error}
          helperText={fieldState.error?.message ?? hint ?? ' '}
        />
      )}
    />
  );
}

export function RhfImage<T extends FieldValues>({ control, name, label, hint, folder }: Readonly<FieldProps<T> & { folder: string }>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange }, fieldState }) => (
        <Stack spacing={0.5}>
          <MediaPickerField label={label} value={String(value ?? '')} onChange={onChange} folder={folder} accept="image/*" helperText={hint} />
          {fieldState.error && <FormHelperText error>{fieldState.error.message}</FormHelperText>}
        </Stack>
      )}
    />
  );
}

export function RhfOnOff<T extends FieldValues>({ control, name, label, hint }: Readonly<FieldProps<T>>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange } }) => (
        <Stack spacing={0}>
          <FormControlLabel control={<Switch checked={value === true} onChange={(_, on) => onChange(on)} />} label={label} />
          {hint && <FormHelperText sx={{ mt: 0 }}>{hint}</FormHelperText>}
        </Stack>
      )}
    />
  );
}
