import { Card, CardContent, Stack, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { RANGE_LABELS, type DashboardRange, type DateWindow } from './dashboardConfig';

const RANGE_ORDER: DashboardRange[] = ['today', 'week', 'month', 'year', 'all', 'custom'];

interface Props {
  range: DashboardRange;
  custom: DateWindow;
  onRangeChange: (range: DashboardRange) => void;
  onCustomChange: (window: DateWindow) => void;
}

export default function RangeFilter({ range, custom, onRangeChange, onCustomChange }: Readonly<Props>) {
  return (
    <Card>
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          alignItems={{ md: 'center' }}
          justifyContent="space-between"
        >
          <ToggleButtonGroup
            size="small"
            value={range}
            exclusive
            onChange={(_, next) => next && onRangeChange(next)}
            aria-label="dashboard time range"
            sx={{ flexWrap: 'wrap', '& .MuiToggleButton-root': { textTransform: 'none', fontWeight: 600 } }}
          >
            {RANGE_ORDER.map((r) => (
              <ToggleButton key={r} value={r} aria-label={r}>
                {RANGE_LABELS[r]}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          {range === 'custom' && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
              <DatePicker
                label="From"
                value={custom.from ?? null}
                onChange={(value) => onCustomChange({ ...custom, from: value ?? undefined })}
                slotProps={{ textField: { size: 'small' } }}
              />
              <DatePicker
                label="To"
                value={custom.to ?? null}
                onChange={(value) => onCustomChange({ ...custom, to: value ?? undefined })}
                slotProps={{ textField: { size: 'small' } }}
              />
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
