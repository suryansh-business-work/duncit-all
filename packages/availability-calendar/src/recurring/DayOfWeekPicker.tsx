import { Box, Checkbox, FormControlLabel, FormGroup, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation, type Translator } from '@duncit/app-settings';
import { weekdayLabels } from '@duncit/slots';

interface Props {
  value: number[];
  onChange: (next: number[]) => void;
  weeklyOff?: number[];
}

type Translate = Translator['t'];

const presets = (t: Translate): ReadonlyArray<{ id: string; label: string; days: number[] }> => [
  { id: 'all', label: t('availability.recurring.all'), days: [0, 1, 2, 3, 4, 5, 6] },
  { id: 'weekdays', label: t('availability.recurring.weekdays'), days: [1, 2, 3, 4, 5] },
  { id: 'weekends', label: t('availability.recurring.weekends'), days: [0, 6] },
];

export default function DayOfWeekPicker({ value, onChange, weeklyOff = [] }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = weekdayLabels(t);
  const selected = new Set(value);
  const toggle = (day: number) => {
    const next = new Set(value);
    if (next.has(day)) next.delete(day);
    else next.add(day);
    onChange([...next].sort((a, b) => a - b));
  };

  return (
    <Box>
      <Stack
        direction="row"
        sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', mb: 0.25 }}
      >
        <Typography variant="body2" sx={{ fontWeight: 800 }}>
          {t('availability.recurring.repeatOn')}
        </Typography>
        <Stack direction="row" spacing={0.25}>
          {presets(t).map((preset) => (
            <DuncitButton key={preset.id} size="small" variant="text" onClick={() => onChange(preset.days)}>
              {preset.label}
            </DuncitButton>
          ))}
        </Stack>
      </Stack>
      <FormGroup row role="group" aria-label={t('availability.recurring.repeatOnDays')}>
        {labels.full.map((fullName, day) => (
          <FormControlLabel
            key={fullName}
            sx={{ mr: 1 }}
            control={
              <Checkbox
                size="small"
                checked={selected.has(day)}
                onChange={() => toggle(day)}
                slotProps={{ input: { 'aria-label': fullName } }}
              />
            }
            label={
              <Typography
                variant="caption"
                sx={{ fontWeight: 700, color: weeklyOff.includes(day) ? 'text.disabled' : 'text.primary' }}
              >
                {labels.short[day]}
              </Typography>
            }
          />
        ))}
      </FormGroup>
    </Box>
  );
}
