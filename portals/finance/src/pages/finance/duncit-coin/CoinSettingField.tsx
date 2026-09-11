import { Controller, type Control } from 'react-hook-form';
import { InputAdornment, TextField } from '@mui/material';
import type { CoinSettingsForm } from './coin-settings.schema';

export interface CoinSettingFieldProps {
  control: Control<CoinSettingsForm>;
  name: keyof CoinSettingsForm;
  label: string;
  unit: string;
  helper: string;
}

/** One whole-number coin setting. The validation message replaces the helper
 * while the field is wrong, so the hint and the error never compete for space. */
export default function CoinSettingField({
  control,
  name,
  label,
  unit,
  helper,
}: Readonly<CoinSettingFieldProps>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          label={label}
          required
          fullWidth
          size="small"
          inputMode="numeric"
          error={!!fieldState.error}
          helperText={fieldState.error?.message ?? helper}
          slotProps={{
            input: {
              endAdornment: <InputAdornment position="end">{unit}</InputAdornment>,
            },
          }}
        />
      )}
    />
  );
}
