import { Controller, useFormContext } from 'react-hook-form';
import { MenuItem, TextField } from '@mui/material';

interface Props {
  name: string;
  label: string;
  options: string[];
  hint?: string;
  required?: boolean;
  allowEmpty?: boolean;
}

/** Single-select dropdown bound to react-hook-form. */
export default function SelectField({ name, label, options, hint, required, allowEmpty = true }: Readonly<Props>) {
  const { control } = useFormContext();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          select
          fullWidth
          size="small"
          label={label}
          required={required}
          {...field}
          value={field.value ?? ''}
          error={!!fieldState.error}
          helperText={fieldState.error?.message ?? hint ?? ' '}
        >
          {allowEmpty && (
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
          )}
          {options.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
      )}
    />
  );
}
