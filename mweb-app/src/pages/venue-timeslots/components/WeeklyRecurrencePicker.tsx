import { Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useFormikContext } from 'formik';
import type { SlotTemplateFormValues } from '../slot-template-form/slot-template.types';

const WEEKDAYS: Array<{ value: number; label: string }> = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];

export default function WeeklyRecurrencePicker() {
  const { values, errors, touched, submitCount, setFieldValue } =
    useFormikContext<SlotTemplateFormValues>();
  const showErr = !!errors.weekdays && (submitCount > 0 || (touched as any).weekdays);

  return (
    <Stack spacing={0.75}>
      <Typography variant="caption" color="text.secondary">
        Repeat on
      </Typography>
      <ToggleButtonGroup
        value={values.weekdays}
        onChange={(_event, next: number[]) =>
          setFieldValue('weekdays', Array.from(new Set(next)).sort((a, b) => a - b))
        }
        size="small"
        color="primary"
        sx={{ flexWrap: 'wrap' }}
      >
        {WEEKDAYS.map((day) => (
          <ToggleButton key={day.value} value={day.value}>
            {day.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      {showErr && (
        <Typography variant="caption" color="error">
          {errors.weekdays as string}
        </Typography>
      )}
    </Stack>
  );
}
