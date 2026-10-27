import { Controller, type Control } from 'react-hook-form';
import { formatISO, isValid, parseISO } from 'date-fns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useTranslation } from '@duncit/shell';
import type { CaseDetailsValues } from './case-details.types';

interface Props {
  control: Control<CaseDetailsValues>;
  disabled: boolean;
}

/**
 * The due date, picked in the admin-configured date format (the shell's
 * localization provider) and kept as an ISO calendar day for the API.
 */
export function DueDateField({ control, disabled }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Controller
      control={control}
      name="due_date"
      render={({ field, fieldState }) => (
        <DatePicker
          label={t('testsManual.field.dueDate')}
          value={field.value ? parseISO(field.value) : null}
          onChange={(date) => field.onChange(date && isValid(date) ? formatISO(date, { representation: 'date' }) : '')}
          disabled={disabled}
          inputRef={field.ref}
          slotProps={{
            field: { clearable: true },
            textField: {
              fullWidth: true,
              size: 'small',
              onBlur: field.onBlur,
              error: Boolean(fieldState.error),
              helperText: fieldState.error?.message ?? ' ',
            },
          }}
        />
      )}
    />
  );
}
