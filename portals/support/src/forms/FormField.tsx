import { useController, useFormContext, type FieldValues, type Path } from 'react-hook-form';
import { TextField, type TextFieldProps } from '@mui/material';

type Omitted = 'name' | 'value' | 'onChange' | 'onBlur' | 'error' | 'helperText';

export interface FormFieldProps extends Omit<TextFieldProps, Omitted> {
  /** react-hook-form field name (resolved against the surrounding FormProvider). */
  name: string;
  /** Helper text shown when the field has no validation error. */
  hint?: string;
}

/**
 * MUI `TextField` wired into react-hook-form via the surrounding `FormProvider`.
 * Real-time validation: shows the validation error once the field is touched or
 * dirty, otherwise renders the supplied `hint` so every input has guidance
 * underneath it.
 */
export default function FormField({ name, hint, ...rest }: Readonly<FormFieldProps>) {
  const { control } = useFormContext<FieldValues>();
  const {
    field,
    fieldState: { error, isTouched, isDirty },
  } = useController({ control, name: name as Path<FieldValues> });
  const showError = Boolean(error && (isTouched || isDirty));
  return (
    <TextField
      {...rest}
      {...field}
      value={field.value ?? ''}
      fullWidth={rest.fullWidth ?? true}
      error={showError}
      helperText={showError ? error?.message : (hint ?? ' ')}
    />
  );
}
