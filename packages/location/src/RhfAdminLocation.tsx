import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { AdminLocationSelect, type AdminLocationSelectProps } from './AdminLocationSelect';
import { EMPTY_LOCATION, type AdminLocationValue } from './types';

interface RhfAdminLocationProps<T extends FieldValues>
  extends Omit<AdminLocationSelectProps, 'value' | 'onChange' | 'errors'> {
  control: Control<T>;
  /** Form field holding the whole AdminLocationValue object. */
  name: Path<T>;
}

/**
 * React-hook-form wrapper: stores the full AdminLocationValue at `name`. The
 * form's Zod schema validates that object (e.g. require `location_id`).
 */
export function RhfAdminLocation<T extends FieldValues>({
  control,
  name,
  ...rest
}: Readonly<RhfAdminLocationProps<T>>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <AdminLocationSelect
          {...rest}
          value={(field.value as AdminLocationValue) ?? EMPTY_LOCATION}
          onChange={field.onChange}
          errors={fieldState.error ? { city: String(fieldState.error.message ?? 'Required') } : undefined}
        />
      )}
    />
  );
}
