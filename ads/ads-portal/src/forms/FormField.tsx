import { Field, useField } from 'formik';
import { TextField, type TextFieldProps } from '@mui/material';

type Omitted = 'name' | 'value' | 'onChange' | 'onBlur' | 'error' | 'helperText';

export interface FormFieldProps extends Omit<TextFieldProps, Omitted> {
  /** Formik field name. */
  name: string;
  /** Helper text shown when the field has no validation error. */
  hint?: string;
}

/**
 * MUI `TextField` wired into Formik. Real-time validation: shows the
 * validation error after the field is touched, otherwise renders the
 * supplied `hint` so every input has guidance underneath it.
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

/** Re-export Formik's `Field` for advanced/custom inputs. */
export { Field };
