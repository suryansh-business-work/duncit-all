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

function DateTimeField({ name, label, testId }: Readonly<{ name: 'start_at' | 'end_at'; label: string; testId: string }>) {
  const { control } = useFormContext<EventFormValues>();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <DateTimePicker
          label={label}
          value={field.value}
          onChange={(date) => field.onChange(date)}
          slotProps={{ textField: { fullWidth: true, required: true, size: 'small', error: Boolean(fieldState.error), helperText: fieldState.error?.message ?? ' ', slotProps: { htmlInput: { 'data-testid': testId } as Record<string, string> } } }}
        />
      )}
    />
  );
}

/** Start, end, and the zone the times are read in. */
export function WhenBox() {
  const { t } = useWebT();
  const { control } = useFormContext<EventFormValues>();
  const current = useWatch({ control, name: 'timezone' });
  const zones = useMemo(() => timeZoneOptions([deviceTimeZone(), current]), [current]);
  return (
    <FieldPanel icon={<ScheduleOutlinedIcon fontSize="small" />} title={t('liteWeb.eventForm.when')} testId="event-when">
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <Stack spacing={0.5} sx={{ flexGrow: 1 }}>
          <DateTimeField name="start_at" label={t('liteWeb.eventForm.start')} testId="event-start" />
          <DateTimeField name="end_at" label={t('liteWeb.eventForm.end')} testId="event-end" />
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
