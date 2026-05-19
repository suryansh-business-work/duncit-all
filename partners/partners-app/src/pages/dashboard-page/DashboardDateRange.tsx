import { forwardRef } from 'react';
import DatePicker from 'react-datepicker';
import { Button, InputAdornment, Stack, TextField } from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { endOfDay, startOfDay, subDays } from 'date-fns';
import type { DashboardRange } from './dashboard.types';

interface Props {
  range: DashboardRange;
  onChange: (range: DashboardRange) => void;
}

interface DateInputProps {
  label: string;
  value?: string;
  onClick?: () => void;
}

const DateInput = forwardRef<HTMLInputElement, DateInputProps>(({ label, value, onClick }, ref) => (
  <TextField
    size="small"
    label={label}
    value={value || ''}
    onClick={onClick}
    inputRef={ref}
    InputProps={{ readOnly: true, startAdornment: <InputAdornment position="start"><CalendarMonthIcon fontSize="small" /></InputAdornment> }}
    sx={{ minWidth: 168 }}
  />
));

export default function DashboardDateRange({ range, onChange }: Props) {
  const setLast30Days = () => onChange({ from: startOfDay(subDays(new Date(), 29)), to: endOfDay(new Date()) });
  const changeFrom = (date: Date | null) => date && onChange({ from: startOfDay(date), to: range.to < date ? endOfDay(date) : range.to });
  const changeTo = (date: Date | null) => date && onChange({ from: range.from > date ? startOfDay(date) : range.from, to: endOfDay(date) });

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
      <DatePicker selected={range.from} onChange={changeFrom} maxDate={range.to} dateFormat="dd MMM yyyy" customInput={<DateInput label="From" />} />
      <DatePicker selected={range.to} onChange={changeTo} minDate={range.from} maxDate={new Date()} dateFormat="dd MMM yyyy" customInput={<DateInput label="To" />} />
      <Button variant="outlined" onClick={setLast30Days} sx={{ borderRadius: 1.25, whiteSpace: 'nowrap' }}>Last 30 days</Button>
    </Stack>
  );
}