import { Controller, useFormContext } from 'react-hook-form';
import { TextField, type TextFieldProps } from '@mui/material';

type Omitted = 'name' | 'value' | 'onChange' | 'onBlur' | 'error' | 'helperText';

export interface FormFieldProps extends Omit<TextFieldProps, Omitted> {
  /** react-hook-form field name. */
  name: string;
  /** Helper text shown when the field has no validation error. */
  hint?: string;
}

/**
 * MUI `TextField` wired into react-hook-form via the surrounding
 * `FormProvider`. Real-time validation: shows the validation error once the
 * field has one, otherwise renders the supplied `hint` so every input has
 * guidance underneath it.
 */
export default function FormField({ name, hint, ...rest }: Readonly<FormFieldProps>) {
  const { control } = useFormContext();
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
