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
 * guidance underneath it (parity with the old Formik `FormField`).
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
      // The ref goes to the <input>, not the TextField's root <div>: on a failed
      // submit react-hook-form focuses the first invalid field through it, and a
      // div cannot take focus (WCAG 3.3.1). MUI wires aria-invalid and links the
      // helper text through aria-describedby from `error`/`helperText`.
      render={({ field: { ref, ...field }, fieldState }) => (
        <TextField
          {...rest}
          {...field}
          inputRef={ref}
          value={field.value ?? ''}
          fullWidth={rest.fullWidth ?? true}
          error={!!fieldState.error}
          helperText={fieldState.error?.message ?? hint ?? ' '}
        />
      )}
    />
  );
}
