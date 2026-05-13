import { Field, useField } from 'formik';
import { TextField, type TextFieldProps } from '@mui/material';

type Omitted = 'name' | 'value' | 'onChange' | 'onBlur' | 'error' | 'helperText';

export interface FormFieldProps extends Omit<TextFieldProps, Omitted> {
  name: string;
  hint?: string;
}

/**
 * MUI `TextField` bound to Formik with real-time validation and a
 * persistent helper hint underneath the field.
 */
export default function FormField({ name, hint, ...rest }: FormFieldProps) {
  const [field, meta] = useField(name);
  const hasChanged = meta.value !== meta.initialValue;
  const showError = Boolean(meta.error && (meta.touched || hasChanged));
  return (
    <TextField
      {...rest}
      {...field}
      fullWidth={rest.fullWidth ?? true}
      error={showError}
      helperText={showError ? meta.error : (hint ?? ' ')}
    />
  );
}

export { Field };
