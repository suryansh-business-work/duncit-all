import { Controller, type Control } from 'react-hook-form';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import type { PodFormValues } from '../types';

interface Props {
  control: Control<PodFormValues>;
  name: 'pod_date_time' | 'pod_end_date_time';
  label: string;
  minDateTime: Date;
  required?: boolean;
  /** Optional MUI X display format (e.g. synced to admin app settings). */
  format?: string;
}

/** MUI X `DateTimePicker` bound to a `Date | null` RHF field. */
export default function DateTimeField({ control, name, label, minDateTime, required, format }: Readonly<Props>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <DateTimePicker
          label={label}
          value={field.value}
          onChange={(date) => field.onChange(date)}
          minDateTime={minDateTime}
          format={format}
          slotProps={{
            textField: {
              fullWidth: true,
              required,
              error: !!fieldState.error,
              helperText: fieldState.error?.message,
            },
          }}
        />
      )}
    />
  );
}
