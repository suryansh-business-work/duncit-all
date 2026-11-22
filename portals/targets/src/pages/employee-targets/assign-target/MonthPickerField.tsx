import { Controller } from 'react-hook-form';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useTranslation } from '@duncit/shell';
import type { AssignTargetControl } from './assign-target.types';

interface Props {
  control: AssignTargetControl;
  disabled: boolean;
}

/**
 * The month a target is for. A year-and-month picker, so a day is never asked
 * for; the date it hands back is reduced to `YYYY-MM` by the schema. Its label
 * format is the picker's own month view, from the admin-configured locale.
 */
export default function MonthPickerField({ control, disabled }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Controller
      control={control}
      name="month"
      render={({ field, fieldState }) => (
        <DatePicker
          label={t('employeeTargets.form.month')}
          views={['year', 'month']}
          openTo="month"
          value={field.value}
          onChange={(value) => field.onChange(value)}
          disabled={disabled}
          slotProps={{
            textField: {
              required: true,
              fullWidth: true,
              onBlur: field.onBlur,
              error: !!fieldState.error,
              helperText: fieldState.error?.message ?? ' ',
            },
          }}
        />
      )}
    />
  );
}
