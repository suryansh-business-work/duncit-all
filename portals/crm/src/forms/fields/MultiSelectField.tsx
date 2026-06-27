import { Controller, useFormContext } from 'react-hook-form';
import { Box, Checkbox, Chip, FormControl, FormHelperText, InputLabel, ListItemText, MenuItem, OutlinedInput, Select } from '@mui/material';

interface Props {
  name: string;
  label: string;
  options: string[];
  hint?: string;
  required?: boolean;
}

/** Multi-select with chips bound to react-hook-form (value is string[]). */
export default function MultiSelectField({ name, label, options, hint, required }: Readonly<Props>) {
  const { control } = useFormContext();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const value = (field.value as string[]) ?? [];
        return (
          <FormControl fullWidth size="small" error={!!fieldState.error} required={required}>
            <InputLabel>{label}</InputLabel>
            <Select
              multiple
              value={value}
              onChange={(event) =>
                field.onChange(typeof event.target.value === 'string' ? event.target.value.split(',') : event.target.value)
              }
              onBlur={field.onBlur}
              input={<OutlinedInput label={label} />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((item) => <Chip key={item} label={item} size="small" />)}
                </Box>
              )}
            >
              {options.map((option) => (
                <MenuItem key={option} value={option}>
                  <Checkbox checked={value.includes(option)} size="small" />
                  <ListItemText primary={option} />
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>{fieldState.error?.message ?? hint ?? ' '}</FormHelperText>
          </FormControl>
        );
      }}
    />
  );
}
