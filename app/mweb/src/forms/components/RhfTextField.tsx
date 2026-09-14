import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { TextField, type TextFieldProps } from '@mui/material';
import { toDigits } from '@duncit/regex';
import { testIdProps } from '../../utils/testIdProps';

type Omitted = 'name' | 'value' | 'onChange' | 'onBlur' | 'error' | 'helperText';

export interface RhfTextFieldProps<T extends FieldValues> extends Omit<TextFieldProps, Omitted> {
  /** react-hook-form control from the parent `useForm`. */
  control: Control<T>;
  /** Typed field name. */
  name: Path<T>;
  /** Helper text shown when the field has no validation error. */
  hint?: string;
  /**
   * An error the FORM does not know about — a server answer such as "already
   * registered" from a debounced check. Rendered exactly like a Zod message,
   * beneath a validation error when both exist.
   */
  errorText?: string;
  /**
   * Keep only digits in what the field stores.
   *
   * `inputMode` is a request, not a rule — a desktop keyboard, a paste and an
   * autofill all get past it — so a number-only box strips on change rather
   * than objecting afterwards. The stripping itself is `toDigits` from
   * @duncit/regex, the same rule the Zod schema then checks the length of.
   */
  digitsOnly?: boolean;
}

/**
 * MUI `TextField` wired into react-hook-form. Shows the Zod validation message
 * once a field has an error, otherwise renders the `hint` so every input keeps
 * guidance underneath it (parity with the old Formik `FormField`). Pass `required`
 * to add MUI's native trailing `*` on the label (themed red app-wide) and set
 * `aria-required` on the input.
 */
export default function RhfTextField<T extends FieldValues>({
  control,
  name,
  hint,
  errorText,
  digitsOnly,
  slotProps,
  ...rest
}: Readonly<RhfTextFieldProps<T>>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { ref, ...field }, fieldState }) => {
        const hasError = !!fieldState.error || !!errorText;
        // Native twin's ids (FormTextField + Field): the box is `field-<name>`,
        // the line under it `<name>-error` or `<name>-hint`.
        const helperId = hasError ? `${name}-error` : `${name}-hint`;
        return (
          <TextField
            data-testid={name}
            {...rest}
            {...field}
            // The <input>, not the root <div>: a failed submit focuses the first
            // invalid field through this ref, and a div cannot take focus.
            inputRef={ref}
            onChange={(event) =>
              field.onChange(digitsOnly ? toDigits(event.target.value) : event.target.value)
            }
            value={field.value ?? ''}
            fullWidth={rest.fullWidth ?? true}
            error={hasError}
            helperText={fieldState.error?.message ?? errorText ?? hint ?? ' '}
            slotProps={{
              ...slotProps,
              htmlInput: { 'data-testid': `field-${name}`, ...slotProps?.htmlInput },
              formHelperText: testIdProps(helperId),
            }}
          />
        );
      }}
    />
  );
}
