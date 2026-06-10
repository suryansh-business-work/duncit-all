import { Box, MenuItem, Stack, TextField } from '@mui/material';
import DateField from '../../components/DateField';

export type Granularity = 'DAY' | 'WEEK' | 'MONTH';

interface Props {
  from: string;
  to: string;
  granularity: Granularity;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  onGranularityChange: (g: Granularity) => void;
}

const PRESETS: { label: string; days: number; granularity: Granularity }[] = [
  { label: 'Last 7 days', days: 7, granularity: 'DAY' },
  { label: 'Last 30 days', days: 30, granularity: 'DAY' },
  { label: 'Last 90 days', days: 90, granularity: 'WEEK' },
  { label: 'Last 12 months', days: 365, granularity: 'MONTH' },
];

const ymd = (d: Date) => d.toISOString().slice(0, 10);

export default function RangePicker({
  from,
  to,
  granularity,
  onFromChange,
  onToChange,
  onGranularityChange,
}: Readonly<Props>) {
  const applyPreset = (days: number, g: Granularity) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days + 1);
    onFromChange(ymd(start));
    onToChange(ymd(end));
    onGranularityChange(g);
  };

  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={2}
      alignItems={{ xs: 'stretch', md: 'center' }}
      sx={{ mb: 2 }}
    >
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {PRESETS.map((p) => (
          <Box
            key={p.label}
            component="button"
            type="button"
            onClick={() => applyPreset(p.days, p.granularity)}
            sx={{
              cursor: 'pointer',
              border: '1px solid',
              borderColor: 'divider',
              background: 'transparent',
              color: 'text.primary',
              borderRadius: 999,
              px: 1.5,
              py: 0.5,
              fontSize: 13,
              '&:hover': { borderColor: '#FF4D4F', color: '#FF4D4F' },
            }}
          >
            {p.label}
          </Box>
        ))}
      </Stack>
      <Stack direction="row" spacing={2}>
        <DateField label="From" size="small" value={from} onChange={onFromChange} />
        <DateField label="To" size="small" value={to} onChange={onToChange} minDate={from ? new Date(from) : undefined} />
        <TextField
          select
          label="Group by"
          size="small"
          value={granularity}
          onChange={(e) => onGranularityChange(e.target.value as Granularity)}
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="DAY">Day</MenuItem>
          <MenuItem value="WEEK">Week</MenuItem>
          <MenuItem value="MONTH">Month</MenuItem>
        </TextField>
      </Stack>
    </Stack>
  );
}
