import { Stack } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { addDays } from 'date-fns';
import DayOfWeekPicker from './DayOfWeekPicker';
import TimeSlotsSection from './TimeSlotsSection';
import SpacePricingSection from './SpacePricingSection';
import type { RecurringForm } from './useRecurringDialog';
import { effectiveMaxAdvance, type VenueSettingsView } from './settings-map';

interface Props {
  form: RecurringForm;
  patch: (p: Partial<RecurringForm>) => void;
  settings: VenueSettingsView;
}

export default function BasicSection({ form, patch, settings }: Readonly<Props>) {
  const maxDate = addDays(new Date(), effectiveMaxAdvance(settings.rules.max_advance_days));
  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <DatePicker
          label="Start date"
          value={form.startDate}
          onChange={(d) => patch({ startDate: d })}
          minDate={new Date()}
          maxDate={maxDate}
          slotProps={{ textField: { fullWidth: true, size: 'small' } }}
        />
        <DatePicker
          label="End date"
          value={form.endDate}
          onChange={(d) => patch({ endDate: d })}
          minDate={form.startDate ?? new Date()}
          maxDate={maxDate}
          slotProps={{ textField: { fullWidth: true, size: 'small' } }}
        />
      </Stack>

      <DayOfWeekPicker
        value={form.weekdays}
        onChange={(weekdays) => patch({ weekdays })}
        weeklyOff={settings.weekly_off_days}
      />

      <TimeSlotsSection
        timeSlots={form.timeSlots}
        onChange={(timeSlots) => patch({ timeSlots })}
        openHours={settings.operating_hours}
        bufferMinutes={settings.rules.buffer_minutes}
      />

      <SpacePricingSection spaces={form.spaces} onChange={(spaces) => patch({ spaces })} />
    </Stack>
  );
}
