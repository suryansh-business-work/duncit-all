import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { TextField, type TextFieldProps } from '@mui/material';

type Omitted = 'name' | 'value' | 'onChange' | 'onBlur' | 'error' | 'helperText';

export interface RhfTextFieldProps<T extends FieldValues> extends Omit<TextFieldProps, Omitted> {
  control: Control<T>;
  name: Path<T>;
  /** Helper text shown when the field has no validation error. */
  hint?: string;
}

/** MUI `TextField` wired into react-hook-form (shows Zod error, else the hint). */
export default function RhfTextField<T extends FieldValues>({
  control,
  name,
  hint,
  ...rest
}: Readonly<RhfTextFieldProps<T>>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          {...rest}
          {...field}
          value={field.value ?? ''}
          fullWidth={rest.fullWidth ?? true}
          error={!!fieldState.error}
          helperText={fieldState.error?.message ?? hint ?? ' '}
        />
      )}
    />
  );
}
