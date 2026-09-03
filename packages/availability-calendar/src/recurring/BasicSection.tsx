import { Box, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { addDays } from 'date-fns';
import { useTranslation } from '@duncit/app-settings';
import { effectiveMaxAdvance, type VenueSettingsView } from '@duncit/slots';
import ConflictModeSection from './ConflictModeSection';
import DayOfWeekPicker from './DayOfWeekPicker';
import TimeSlotsSection from './TimeSlotsSection';
import SpacePricingSection from './SpacePricingSection';
import type { RecurringForm } from './useRecurringDialog';

interface Props {
  form: RecurringForm;
  patch: (p: Partial<RecurringForm>) => void;
  settings: VenueSettingsView;
}

export default function BasicSection({ form, patch, settings }: Readonly<Props>) {
  const { t } = useTranslation();
  const maxDate = addDays(new Date(), effectiveMaxAdvance(settings.rules.max_advance_days));
  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <DatePicker
          label={t('availability.startDate')}
          value={form.startDate}
          onChange={(d) => patch({ startDate: d })}
          minDate={new Date()}
          maxDate={maxDate}
          slotProps={{ textField: { fullWidth: true, size: 'small' } }}
        />
        <DatePicker
          label={t('availability.endDate')}
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

      <FormControlLabel
        control={<Switch checked={form.wholeDay} onChange={(e) => patch({ wholeDay: e.target.checked })} />}
        label={
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 800 }}>
              {t('availability.wholeDay')}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('availability.recurring.wholeDayHint')}
            </Typography>
          </Box>
        }
      />

      {!form.wholeDay && (
        <TimeSlotsSection
          timeSlots={form.timeSlots}
          onChange={(timeSlots) => patch({ timeSlots })}
          openHours={settings.operating_hours}
          bufferMinutes={settings.rules.buffer_minutes}
        />
      )}

      <SpacePricingSection spaces={form.spaces} onChange={(spaces) => patch({ spaces })} />

      <ConflictModeSection
        value={form.conflictMode}
        onChange={(conflictMode) => patch({ conflictMode })}
      />
    </Stack>
  );
}
