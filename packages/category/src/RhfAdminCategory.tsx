import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { AdminCategorySelect, type AdminCategorySelectProps } from './AdminCategorySelect';
import { EMPTY_CATEGORY, type AdminCategoryValue } from './types';

interface RhfAdminCategoryProps<T extends FieldValues>
  extends Omit<AdminCategorySelectProps, 'value' | 'onChange' | 'errors'> {
  control: Control<T>;
  /** Form field holding the whole AdminCategoryValue object. */
  name: Path<T>;
}

/** React-hook-form wrapper: stores the full AdminCategoryValue at `name`. */
export function RhfAdminCategory<T extends FieldValues>({
  control,
  name,
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
          onChange={field.onChange}
          errors={fieldState.error ? { sub: String(fieldState.error.message ?? 'Required') } : undefined}
        />
      )}
    />
  );
}
