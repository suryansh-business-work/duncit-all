import { useState } from 'react';
import { Autocomplete, Box, MenuItem, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import { useFormikContext } from 'formik';
import type { SlotTemplateFormValues } from '../slot-template-form/slot-template.types';

const NTH_OPTIONS = [
  { value: 1, label: 'First' },
  { value: 2, label: 'Second' },
  { value: 3, label: 'Third' },
  { value: 4, label: 'Fourth' },
  { value: -1, label: 'Last' },
];

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => i + 1);

export default function MonthlyRecurrencePicker() {
  const { values, setFieldValue, errors, submitCount } =
    useFormikContext<SlotTemplateFormValues>();
  const [tab, setTab] = useState<'by-date' | 'by-weekday'>(
    values.month_nth_weekday ? 'by-weekday' : 'by-date',
  );

  const handleTab = (next: 'by-date' | 'by-weekday') => {
    setTab(next);
    if (next === 'by-date') {
      setFieldValue('month_nth_weekday', null);
    } else {
      setFieldValue('month_days', []);
      if (!values.month_nth_weekday) {
        setFieldValue('month_nth_weekday', { nth: 1, weekday: 1 });
      }
    }
  };

  return (
    <Stack spacing={1}>
      <Tabs value={tab} onChange={(_, v) => handleTab(v)} variant="fullWidth">
        <Tab value="by-date" label="By date" />
        <Tab value="by-weekday" label="By weekday" />
      </Tabs>
      {tab === 'by-date' ? (
        <Box>
          <Autocomplete
            multiple
            options={DAYS_OF_MONTH}
            value={values.month_days}
            onChange={(_, next) =>
              setFieldValue('month_days', Array.from(new Set(next)).sort((a, b) => a - b))
            }
            getOptionLabel={(o) => String(o)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Days of month"
                placeholder="e.g. 1, 15"
                helperText={submitCount > 0 && (errors.month_days as string)}
                error={!!(submitCount > 0 && errors.month_days)}
              />
            )}
          />
        </Box>
      ) : (
        <Stack direction="row" spacing={1}>
          <TextField
            select
            label="When"
            value={values.month_nth_weekday?.nth ?? 1}
            onChange={(event) =>
              setFieldValue('month_nth_weekday', {
                nth: Number(event.target.value),
                weekday: values.month_nth_weekday?.weekday ?? 1,
              })
            }
            fullWidth
          >
            {NTH_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Weekday"
            value={values.month_nth_weekday?.weekday ?? 1}
            onChange={(event) =>
              setFieldValue('month_nth_weekday', {
                nth: values.month_nth_weekday?.nth ?? 1,
                weekday: Number(event.target.value),
              })
            }
            fullWidth
          >
            {WEEKDAY_NAMES.map((name, idx) => (
              <MenuItem key={idx} value={idx}>
                {name}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      )}
      <Typography variant="caption" color="text.secondary">
        Choose either specific dates of month, or "Second Monday" style nth-weekday.
      </Typography>
    </Stack>
  );
}
