import { useMemo } from 'react';
import { Controller, type Control } from 'react-hook-form';
import { Autocomplete, Stack, TextField } from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { SectionCard } from '@duncit/ui';
import { deviceTimeZone } from '../../../../shared/format';
import { useWebT } from '../../../../shared/i18n';
import type { EventFormValues } from '../event.types';

/** Every IANA zone the browser knows; the device's own when it cannot list them. */
function timeZones(): string[] {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    return [deviceTimeZone()];
  }
}

interface PickerProps {
  control: Control<EventFormValues>;
  name: 'start_at' | 'end_at';
  label: string;
  testId: string;
}

function DateTimeField({ control, name, label, testId }: Readonly<PickerProps>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <DateTimePicker
          label={label}
          value={field.value}
          onChange={(date) => field.onChange(date)}
          slotProps={{ textField: { fullWidth: true, required: true, error: Boolean(fieldState.error), helperText: fieldState.error?.message ?? ' ', slotProps: { htmlInput: { 'data-testid': testId } as Record<string, string> } } }}
        />
      )}
    />
  );
}

/** Start, end and the zone the times are read in. */
export function WhenSection({ control }: Readonly<{ control: Control<EventFormValues> }>) {
  const { t } = useWebT();
  const zones = useMemo(timeZones, []);
  return (
    <SectionCard title={t('liteWeb.eventForm.when')} subtitle={t('liteWeb.eventForm.whenHint')}>
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <DateTimeField control={control} name="start_at" label={t('liteWeb.eventForm.start')} testId="event-start" />
          <DateTimeField control={control} name="end_at" label={t('liteWeb.eventForm.end')} testId="event-end" />
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
              renderInput={(params) => (
                <TextField
                  {...params}
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
    </SectionCard>
  );
}
