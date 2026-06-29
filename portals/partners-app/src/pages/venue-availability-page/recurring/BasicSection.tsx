import { Box, Stack, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { addDays } from 'date-fns';
import DayOfWeekPicker from './DayOfWeekPicker';
import PricingSection from './PricingSection';
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

      <Box>
        <Typography variant="body2" sx={{ fontWeight: 800, mb: 0.5 }}>
          Time
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TimePicker
            label="Start time"
            value={form.startTime}
            onChange={(t) => patch({ startTime: t })}
            slotProps={{ textField: { fullWidth: true, size: 'small' } }}
          />
          <TimePicker
            label="End time"
            value={form.endTime}
            onChange={(t) => patch({ endTime: t })}
            slotProps={{ textField: { fullWidth: true, size: 'small' } }}
          />
        </Stack>
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
          <InfoOutlinedIcon fontSize="inherit" color="action" />
          <Typography variant="caption" color="text.secondary">
            Venue hours {settings.operating_hours.open}–{settings.operating_hours.close}. Slots must fit inside.
          </Typography>
        </Stack>
      </Box>

      <PricingSection
        defaultPrice={form.defaultPrice}
        onDefaultPrice={(defaultPrice) => patch({ defaultPrice })}
        weekdays={form.weekdays}
        perDayPrice={form.perDayPrice}
        onPerDayPrice={(perDayPrice) => patch({ perDayPrice })}
      />
    </Stack>
  );
}
