import { Controller, type Control } from 'react-hook-form';
import { Box, Checkbox, FormControlLabel, FormGroup, FormHelperText, Typography } from '@mui/material';
import { LEVELS } from './queries';
import type { TelemetrySettingsForm } from './schema';

type PersistedLevels = TelemetrySettingsForm['persisted_levels'];

/** Add or remove one level, keeping the field's declared order. */
const toggleLevel = (
  levels: PersistedLevels,
  level: PersistedLevels[number],
  checked: boolean,
): PersistedLevels => (checked ? [...levels, level] : levels.filter((l) => l !== level));

interface Props {
  control: Control<TelemetrySettingsForm>;
  errorMessage?: string;
  hasError: boolean;
}

/** One checkbox per log level that should be written to the database. */
export default function PersistedLevelsField({ control, errorMessage, hasError }: Readonly<Props>) {
  return (
    <Box>
      <Typography variant="body2" gutterBottom sx={{
        fontWeight: 600
      }}>
        Levels persisted to the database
      </Typography>
      <Controller
        name="persisted_levels"
        control={control}
        render={({ field }) => (
          <FormGroup row>
            {LEVELS.map((lvl) => (
              <FormControlLabel
                key={lvl}
                control={
                  <Checkbox
                    checked={field.value.includes(lvl)}
                    onChange={(e) =>
                      field.onChange(toggleLevel(field.value, lvl, e.target.checked))
                    }
                  />
                }
                label={lvl}
              />
            ))}
          </FormGroup>
        )}
      />
      {hasError && (
        <FormHelperText error>{errorMessage}</FormHelperText>
      )}
    </Box>
  );
}
