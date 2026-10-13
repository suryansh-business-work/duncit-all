import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { AdminCategorySelect, type AdminCategorySelectProps } from './AdminCategorySelect';
import { EMPTY_CATEGORY, type AdminCategoryValue } from './types';

interface RhfAdminCategoryProps<T extends FieldValues>
  extends Omit<AdminCategorySelectProps, 'value' | 'onChange' | 'errors'> {
  control: Control<T>;
  /** Form field holding the whole AdminCategoryValue object. */
  name: Path<T>;
  /** Error text for the sub level that the form's own state does not carry
   * (e.g. "already added" from a rows field). Wins over the field's error. */
  subError?: string;
  /** Called after a pick is written to the form — for a caller that re-validates as the value changes. */
  onValueChange?: (value: AdminCategoryValue) => void;
}

/** The sub-level error: the caller's own text first, then the field's. */
const subErrors = (subError: string | undefined, fieldError: { message?: string } | undefined) => {
  if (subError) return { sub: subError };
  return fieldError ? { sub: String(fieldError.message ?? 'Required') } : undefined;
};

/** React-hook-form wrapper: stores the full AdminCategoryValue at `name`. */
export function RhfAdminCategory<T extends FieldValues>({
  control,
  name,
  subError,
  onValueChange,
  ...rest
}: Readonly<RhfAdminCategoryProps<T>>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <AdminCategorySelect
          {...rest}
          value={(field.value as AdminCategoryValue) ?? EMPTY_CATEGORY}
          onChange={(value) => {
            field.onChange(value);
            onValueChange?.(value);
          }}
          errors={subErrors(subError, fieldState.error)}
        />
      )}
    />
  );
}
