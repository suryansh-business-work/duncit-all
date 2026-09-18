import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { MenuItem, TextField } from '@mui/material';

interface RhfSelectProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  /** Operator-written choices (cancel and return reasons) — shown as they are written. */
  options: string[];
}

/** A labelled MUI select wired into react-hook-form, with its error under it. */
export function RhfSelect<T extends FieldValues>({ control, name, label, options }: Readonly<RhfSelectProps<T>>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { ref, ...field }, fieldState }) => (
        <TextField
          {...field}
          inputRef={ref}
          select
          fullWidth
          required
          label={label}
          value={field.value ?? ''}
          error={Boolean(fieldState.error)}
          helperText={fieldState.error?.message ?? ' '}
        >
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
