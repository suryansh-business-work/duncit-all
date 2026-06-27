import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { TextField, type TextFieldProps } from '@mui/material';

type Omitted = 'name' | 'value' | 'onChange' | 'onBlur' | 'error' | 'helperText';

export interface RhfTextFieldProps<T extends FieldValues> extends Omit<TextFieldProps, Omitted> {
  /** react-hook-form control from the parent `useForm`. */
  control: Control<T>;
  /** Typed field name. */
  name: Path<T>;
  /** Helper text shown when the field has no validation error. */
  hint?: string;
}

/**
 * MUI `TextField` wired into react-hook-form. Shows the Zod validation message
 * once a field has an error, otherwise renders the `hint` so every input keeps
 * guidance underneath it (parity with the old Formik fields). Mirrors the mWeb
 * `RhfTextField`.
 */
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
