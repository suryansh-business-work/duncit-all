import { Controller, useForm, type Control, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import RefreshIcon from '@mui/icons-material/Refresh';
import { format, isValid, parseISO } from 'date-fns';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { DAY_PATTERN, makeDateWindowSchema, type DateWindowValues } from './date-window.types';

interface DayFieldProps {
  control: Control<DateWindowValues>;
  name: keyof DateWindowValues;
  label: string;
}

/**
 * One calendar day through an MUI X picker (rule 11). The value stays a
 * `yyyy-MM-dd` string, which is what MSG91 is asked with; the picker shows it
 * in the admin-configured pattern through the shell's localization provider.
 */
function DayField({ control, name, label }: Readonly<DayFieldProps>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const parsed = field.value ? parseISO(field.value) : null;
        return (
          <DatePicker
            label={label}
            value={parsed && isValid(parsed) ? parsed : null}
            onChange={(next) => field.onChange(next && isValid(next) ? format(next, DAY_PATTERN) : '')}
            disableFuture
            slotProps={{
              textField: {
                size: 'small',
                error: !!fieldState.error,
                helperText: fieldState.error?.message ?? ' ',
                onBlur: field.onBlur,
              },
            }}
          />
        );
      }}
    />
  );
}

interface Props {
  initial: DateWindowValues;
  maxDays: number;
  busy: boolean;
  onSubmit: (values: DateWindowValues) => void;
}

/** The From / To window both MSG91 pages read, validated against MSG91's limits. */
export default function DateWindowForm({ initial, maxDays, busy, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const { control, handleSubmit } = useForm<DateWindowValues, any, DateWindowValues>({
    defaultValues: initial,
    resolver: zodResolver(makeDateWindowSchema(t, maxDays)) as unknown as Resolver<
      DateWindowValues,
      any,
      DateWindowValues
    >,
    mode: 'onChange',
  });

  return (
    <Stack
      component="form"
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      sx={{ alignItems: { sm: 'flex-start' } }}
      data-testid="msg91-date-window"
    >
      <DayField control={control} name="start" label={t('tech.msg91.from')} />
      <DayField control={control} name="end" label={t('tech.msg91.to')} />
      <DuncitButton type="submit" variant="contained" startIcon={<RefreshIcon />} loading={busy} sx={{ mt: { sm: 0.25 } }}>
        {t('tech.msg91.load')}
      </DuncitButton>
    </Stack>
  );
}
