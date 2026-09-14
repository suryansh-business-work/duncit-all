import { Checkbox, FormControl, FormControlLabel, FormHelperText, FormLabel, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { journeyHint, journeyLabel } from '../labels';

interface Props {
  journeys: readonly string[];
  value: readonly string[];
  onChange: (next: string[]) => void;
  error?: string;
}

/** Which pages the bots walk. Kept in the catalogue's order whatever order they are ticked in. */
export default function JourneyPicker({ journeys, value, onChange, error }: Readonly<Props>) {
  const { t } = useTranslation();
  const toggle = (journey: string, checked: boolean) =>
    onChange(journeys.filter((j) => (j === journey ? checked : value.includes(j))));

  return (
    <FormControl error={Boolean(error)} component="fieldset" variant="standard">
      <FormLabel component="legend">{t('tech.stress.journeysLabel')}</FormLabel>
      <Stack sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, columnGap: 2 }}>
        {journeys.map((journey) => (
          <FormControlLabel
            key={journey}
            control={
              <Checkbox
                size="small"
                checked={value.includes(journey)}
                onChange={(_, checked) => toggle(journey, checked)}
              />
            }
            label={
              <Stack>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {journeyLabel(t, journey)}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {journeyHint(t, journey)}
                </Typography>
              </Stack>
            }
          />
        ))}
      </Stack>
      <FormHelperText>{error ?? t('tech.stress.journeysHint')}</FormHelperText>
    </FormControl>
  );
}
