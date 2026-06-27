import { Controller, useFormContext } from 'react-hook-form';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

interface Props {
  name: string;
  label: string;
  hint?: string;
}

/** MUIX date picker bound to react-hook-form (value is Date | null). */
export default function DateField({ name, label, hint }: Readonly<Props>) {
  const { control } = useFormContext();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <DatePicker
          label={label}
          value={field.value ?? null}
          onChange={(value) => field.onChange(value)}
          slotProps={{
            textField: {
              size: 'small',
              fullWidth: true,
              onBlur: field.onBlur,
              error: !!fieldState.error,
              helperText: fieldState.error?.message ?? hint ?? ' ',
            },
          }}
        />
      )}
    />
  );
}
