import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { TextField, type TextFieldProps } from '@mui/material';

type Omitted = 'name' | 'value' | 'onChange' | 'onBlur' | 'error' | 'helperText';

export type FormFieldErrorMode = 'always' | 'touchedOrDirty';

export interface FormFieldProps<T extends FieldValues = FieldValues>
  extends Omit<TextFieldProps, Omitted> {
  /** Typed field name (a plain string when relying on the surrounding `FormProvider`). */
  name: Path<T>;
  /** react-hook-form control; omit to resolve it from the surrounding `FormProvider`. */
  control?: Control<T>;
  /** Helper text shown when the field has no validation error. */
  hint?: string;
  /**
   * When to surface a validation error: 'always' shows it immediately
   * (admin/crm behavior, default); 'touchedOrDirty' waits until the field is
   * touched or dirty (support behavior).
   */
  errorMode?: FormFieldErrorMode;
}

/**
 * Legacy MUI `TextField` + react-hook-form wrapper (pre-`RhfTextField`).
 * Works with an explicit `control` prop or the surrounding `FormProvider`,
 * shows the validation error per `errorMode` and otherwise renders the
 * persistent `hint` so every input has guidance underneath it.
 */
export default function FormField<T extends FieldValues = FieldValues>({
  control,
  name,
  hint,
  errorMode = 'always',
  ...rest
}: Readonly<FormFieldProps<T>>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const { error, isTouched, isDirty } = fieldState;
        const visible = errorMode === 'always' || isTouched || isDirty;
        const showError = Boolean(error) && visible;
        const fallback = hint ?? ' ';
        const helperText = showError ? (error?.message ?? fallback) : fallback;
        return (
          <TextField
            {...rest}
            {...field}
            value={field.value ?? ''}
            fullWidth={rest.fullWidth ?? true}
            error={showError}
            helperText={helperText}
          />
        );
      }}
    />
  );
}
