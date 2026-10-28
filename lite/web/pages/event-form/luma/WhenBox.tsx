import { useMemo } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { Autocomplete, Stack, TextField } from '@mui/material';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { deviceTimeZone } from '../../../../shared/format';
import { useWebT } from '../../../../shared/i18n';
import { timeZoneOptions } from '../../../../shared/timezones';
import type { EventFormValues } from '../event.types';
import { FieldPanel } from './FieldPanel';

const HOUR_MS = 60 * 60 * 1000;

interface DateTimeFieldProps {
  name: 'start_at' | 'end_at';
  label: string;
  testId: string;
  /** Days and times before this are blocked in the picker. */
  minDateTime?: Date;
  disablePast?: boolean;
  onPicked?: (date: Date) => void;
}

function DateTimeField({ name, label, testId, minDateTime, disablePast, onPicked }: Readonly<DateTimeFieldProps>) {
  const { control } = useFormContext<EventFormValues>();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <DateTimePicker
          label={label}
          value={field.value}
          minDateTime={minDateTime}
          disablePast={disablePast}
          onChange={(date) => {
            // Before the change lands, so the handler still reads the old value beside the new one.
            if (date && !Number.isNaN(date.getTime())) onPicked?.(date);
            field.onChange(date);
          }}
          slotProps={{ textField: { fullWidth: true, required: true, size: 'small', error: Boolean(fieldState.error), helperText: fieldState.error?.message ?? ' ', slotProps: { htmlInput: { 'data-testid': testId } as Record<string, string> } } }}
        />
      )}
    />
  );
}

/** Start, end, and the zone the times are read in. */
export function WhenBox() {
  const { t } = useWebT();
  const { control, getValues, setValue, formState } = useFormContext<EventFormValues>();
  const [current, start] = useWatch({ control, name: ['timezone', 'start_at'] });
  // A saved event that already started keeps its start; a new or future one cannot start in the past.
  const savedStart = formState.defaultValues?.start_at;
  const startedAlready = savedStart instanceof Date && savedStart.getTime() < Date.now();
  /** Moving the start past the end carries the end along, keeping the length (an hour if there was none). */
  const startPicked = (next: Date) => {
    const previousStart = getValues('start_at');
    const end = getValues('end_at');
    if (end.getTime() > next.getTime()) return;
    const length = end.getTime() - previousStart.getTime();
    setValue('end_at', new Date(next.getTime() + (length > 0 ? length : HOUR_MS)), { shouldDirty: true, shouldValidate: true });
  };
  const zones = useMemo(() => timeZoneOptions([deviceTimeZone(), current]), [current]);
  return (
    <FieldPanel icon={<ScheduleOutlinedIcon fontSize="small" />} title={t('liteWeb.eventForm.when')} testId="event-when">
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <Stack spacing={0.5} sx={{ flexGrow: 1 }}>
          <DateTimeField name="start_at" label={t('liteWeb.eventForm.start')} testId="event-start" disablePast={!startedAlready} onPicked={startPicked} />
          <DateTimeField name="end_at" label={t('liteWeb.eventForm.end')} testId="event-end" minDateTime={start} />
        </Stack>
        <Controller
          control={control}
          name="timezone"
          render={({ field, fieldState }) => (
            <Autocomplete
              options={zones}
              value={field.value}
              onChange={(_event, value) => field.onChange(value ?? '')}
              disableClearable
              sx={{ minWidth: { sm: 200 } }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  label={t('liteWeb.eventForm.timezone')}
                  error={Boolean(fieldState.error)}
                  helperText={fieldState.error?.message ?? t('liteWeb.eventForm.timezoneHint')}
                  slotProps={{ ...params.slotProps, htmlInput: { ...params.slotProps.htmlInput, 'data-testid': 'event-timezone' } }}
                />
              )}
            />
          )}
        />
      </Stack>
    </FieldPanel>
  );
}
