import { Box, Button, Checkbox, FormControlLabel, FormGroup, Stack, Typography } from '@mui/material';
import { WEEKDAY_FULL, WEEKDAY_LABELS } from './settings-map';
import { useTranslation } from '@duncit/shell';

interface Props {
  value: number[];
  onChange: (next: number[]) => void;
  weeklyOff?: number[];
}

type Translate = ReturnType<typeof useTranslation>['t'];

const presets = (t: Translate): ReadonlyArray<{ label: string; days: number[] }> =>[
  { label: t('partners.common.all'), days: [0, 1, 2, 3, 4, 5, 6] },
  { label: t('partners.venueAvailabilityPage.weekdays'), days: [1, 2, 3, 4, 5] },
  { label: t('partners.venueAvailabilityPage.weekends'), days: [0, 6] },
];

export default function DayOfWeekPicker({ value, onChange, weeklyOff = [] }: Readonly<Props>) {
  const { t } = useTranslation();
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
          {presets(t).map((preset) => (
            <Button key={preset.label} size="small" variant="text" onClick={() => onChange(preset.days)}>
              {preset.label}
            </Button>
          ))}
        </Stack>
      </Stack>
      <FormGroup row role="group" aria-label={t('partners.venueAvailabilityPage.repeatOnDays')}>
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
