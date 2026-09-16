import { Controller, useWatch, type Control } from 'react-hook-form';
import {
  Checkbox,
  Chip,
  FormControl,
  FormControlLabel,
  FormLabel,
  ListItemText,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  TextField,
} from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { scopeOptions, type StatusFormValues } from './status.types';
import type { StatusLocationOption } from '../queries';

interface Props {
  control: Control<StatusFormValues>;
  locations: StatusLocationOption[];
}

/** The picked cities, as chips, inside the closed select. */
function cityChips(ids: string[], locations: StatusLocationOption[]) {
  return (
    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
      {ids.map((id) => (
        <Chip
          key={id}
          size="small"
          label={locations.find((city) => city.id === id)?.location_name ?? id}
        />
      ))}
    </Stack>
  );
}

/**
 * Who sees the status.
 *
 * A LOCATION status is matched against the city the viewer has SELECTED in the
 * app's location picker, not the one on their profile — someone browsing
 * Bengaluru for the weekend is looking at Bengaluru.
 */
export default function StatusScopeFields({ control, locations }: Readonly<Props>) {
  const { t } = useTranslation();
  const scope = useWatch({ control, name: 'scope' });

  return (
    <Stack spacing={2}>
      <Controller
        control={control}
        name="scope"
        render={({ field }) => (
          <FormControl>
            <FormLabel id="status-scope-label">{t('marketing.status.scope')}</FormLabel>
            <RadioGroup
              row
              aria-labelledby="status-scope-label"
              value={field.value}
              onChange={field.onChange}
            >
              {scopeOptions(t).map((option) => (
                <FormControlLabel
                  key={option.value}
                  value={option.value}
                  label={option.label}
                  control={<Radio data-testid={option.testId} />}
                />
              ))}
            </RadioGroup>
          </FormControl>
        )}
      />

      {scope === 'LOCATION' && (
        <Controller
          control={control}
          name="location_ids"
          render={({ field, fieldState }) => (
            <TextField
              select
              required
              fullWidth
              label={t('marketing.status.cities')}
              data-testid="status-cities-select"
              value={field.value}
              onBlur={field.onBlur}
              onChange={(event) => field.onChange(event.target.value)}
              error={!!fieldState.error}
              helperText={fieldState.error?.message ?? t('marketing.status.citiesHint')}
              slotProps={{
                select: {
                  multiple: true,
                  renderValue: (selected) => cityChips(selected as string[], locations),
                },
              }}
            >
              {locations.map((city) => (
                <MenuItem key={city.id} value={city.id}>
                  <Checkbox size="small" checked={field.value.includes(city.id)} />
                  <ListItemText primary={city.location_name} />
                </MenuItem>
              ))}
            </TextField>
          )}
        />
      )}
    </Stack>
  );
}
