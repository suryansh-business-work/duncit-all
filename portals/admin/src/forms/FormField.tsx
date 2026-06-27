import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { TextField, type TextFieldProps } from '@mui/material';

type Omitted = 'name' | 'value' | 'onChange' | 'onBlur' | 'error' | 'helperText';

export interface FormFieldProps<T extends FieldValues> extends Omit<TextFieldProps, Omitted> {
  /** react-hook-form control from the parent `useForm`. */
  control: Control<T>;
  /** Typed field name. */
  name: Path<T>;
  hint?: string;
}

/**
 * MUI `TextField` bound to react-hook-form with real-time validation and a
 * persistent helper hint underneath the field.
 */
export default function FormField<T extends FieldValues>({
  control,
  name,
  hint,
  ...rest
}: Readonly<FormFieldProps<T>>) {
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
