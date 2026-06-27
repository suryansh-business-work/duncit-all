import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { TextField, type TextFieldProps } from '@mui/material';

type Omitted = 'name' | 'value' | 'onChange' | 'onBlur' | 'error' | 'helperText' | 'type';

interface RhfNumberFieldProps<T extends FieldValues> extends Omit<TextFieldProps, Omitted> {
  control: Control<T>;
  name: Path<T>;
  /** Helper text shown when the field has no validation error. */
  hint?: string;
}

const toNumber = (raw: string) => (raw === '' ? 0 : Number(raw));

/**
 * Numeric `TextField` bound to react-hook-form. Keeps the stored value a
 * `number` (empty input maps to `0`, matching the previous Formik `num()`),
 * and shows the Zod validation message or the supplied `hint`.
 */
export default function RhfNumberField<T extends FieldValues>({
  control,
  name,
  hint,
  ...rest
}: Readonly<RhfNumberFieldProps<T>>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          {...rest}
          type="number"
          fullWidth={rest.fullWidth ?? true}
          name={field.name}
          inputRef={field.ref}
          value={field.value ?? ''}
          onChange={(event) => field.onChange(toNumber(event.target.value))}
          onBlur={field.onBlur}
          error={!!fieldState.error}
          helperText={fieldState.error?.message ?? hint ?? ' '}
        />
      )}
    />
  );
}
