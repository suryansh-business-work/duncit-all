import { Chip, IconButton, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useFormikContext } from 'formik';
import { useState } from 'react';
import type { SlotTemplateFormValues } from '../slot-template-form/slot-template.types';

const formatYMD = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function SpecificDatesPicker() {
  const { values, errors, submitCount, setFieldValue } =
    useFormikContext<SlotTemplateFormValues>();
  const [pending, setPending] = useState<Date | null>(null);

  const add = () => {
    if (!pending || Number.isNaN(pending.getTime())) return;
    const ymd = formatYMD(pending);
    const next = Array.from(new Set([...values.specific_dates, ymd])).sort();
    setFieldValue('specific_dates', next);
    setPending(null);
  };

  const remove = (value: string) => {
    setFieldValue(
      'specific_dates',
      values.specific_dates.filter((d) => d !== value),
    );
  };

  const showErr = submitCount > 0 && !!errors.specific_dates;

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} alignItems="center">
        <DatePicker
          label="Add a date"
          value={pending}
          minDate={new Date()}
          onChange={(value) => setPending(value)}
          slotProps={{ textField: { fullWidth: true, size: 'small' } }}
        />
        <IconButton onClick={add} color="primary" disabled={!pending}>
          <AddIcon />
        </IconButton>
      </Stack>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
        {values.specific_dates.length === 0 && (
          <Typography variant="caption" color="text.secondary">
            No dates added yet.
          </Typography>
        )}
        {values.specific_dates.map((date) => (
          <Chip key={date} label={date} onDelete={() => remove(date)} />
        ))}
      </Stack>
      {showErr && (
        <Typography variant="caption" color="error">
          {errors.specific_dates as string}
        </Typography>
      )}
    </Stack>
  );
}
