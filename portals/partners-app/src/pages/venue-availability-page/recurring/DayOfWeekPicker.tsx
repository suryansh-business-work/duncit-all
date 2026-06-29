import { Box, Button, Checkbox, FormControlLabel, FormGroup, Stack, Typography } from '@mui/material';
import { WEEKDAY_FULL, WEEKDAY_LABELS } from './settings-map';

interface Props {
  value: number[];
  onChange: (next: number[]) => void;
  weeklyOff?: number[];
}

const PRESETS: ReadonlyArray<{ label: string; days: number[] }> = [
  { label: 'All', days: [0, 1, 2, 3, 4, 5, 6] },
  { label: 'Weekdays', days: [1, 2, 3, 4, 5] },
  { label: 'Weekends', days: [0, 6] },
];

export default function DayOfWeekPicker({ value, onChange, weeklyOff = [] }: Readonly<Props>) {
  const selected = new Set(value);
  const toggle = (day: number) => {
    const next = new Set(value);
    if (next.has(day)) next.delete(day);
    else next.add(day);
    onChange([...next].sort((a, b) => a - b));
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" sx={{ mb: 0.25 }}>
        <Typography variant="body2" sx={{ fontWeight: 800 }}>
          Repeat on
        </Typography>
        <Stack direction="row" spacing={0.25}>
          {PRESETS.map((preset) => (
            <Button key={preset.label} size="small" variant="text" onClick={() => onChange(preset.days)}>
              {preset.label}
            </Button>
          ))}
        </Stack>
      </Stack>
      <FormGroup row role="group" aria-label="Repeat on days">
        {WEEKDAY_LABELS.map((label, day) => (
          <FormControlLabel
            key={label}
            sx={{ mr: 1 }}
            control={
              <Checkbox
                size="small"
                checked={selected.has(day)}
                onChange={() => toggle(day)}
                inputProps={{ 'aria-label': WEEKDAY_FULL[day] }}
              />
            }
            label={
              <Typography
                variant="caption"
                sx={{ fontWeight: 700, color: weeklyOff.includes(day) ? 'text.disabled' : 'text.primary' }}
              >
                {label}
              </Typography>
            }
          />
        ))}
      </FormGroup>
    </Box>
  );
}
