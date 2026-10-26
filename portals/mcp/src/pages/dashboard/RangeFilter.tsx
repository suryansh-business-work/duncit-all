import { Stack } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useTranslation } from '@duncit/shell';
import type { DayRange, RangeProblem } from './useDashboardRange';

interface RangeFilterProps {
  range: DayRange;
  problem: RangeProblem;
  onChange: (range: DayRange) => void;
}

/**
 * The dashboard's From / To days, in the admin's date format (the provider
 * above sets it). A half-typed date is ignored until it is a real one.
 */
export default function RangeFilter({ range, problem, onChange }: Readonly<RangeFilterProps>) {
  const { t } = useTranslation();
  const pick = (field: keyof DayRange) => (value: Date | null) => {
    if (value && !Number.isNaN(value.getTime())) onChange({ ...range, [field]: value });
  };
  const message = problem === 'order' ? t('mcp.dashboard.rangeOrder') : t('mcp.dashboard.rangeTooLong');
  const helperText = problem ? message : undefined;
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
      <DatePicker
        label={t('mcp.dashboard.from')}
        value={range.from}
        onChange={pick('from')}
        maxDate={range.to}
        slotProps={{ textField: { size: 'small', error: Boolean(problem), helperText } }}
      />
      <DatePicker
        label={t('mcp.dashboard.to')}
        value={range.to}
        onChange={pick('to')}
        minDate={range.from}
        slotProps={{ textField: { size: 'small', error: Boolean(problem) } }}
      />
    </Stack>
  );
}
