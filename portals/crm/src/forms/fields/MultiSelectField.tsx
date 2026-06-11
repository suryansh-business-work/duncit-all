import { useField } from 'formik';
import { Box, Checkbox, Chip, FormControl, FormHelperText, InputLabel, ListItemText, MenuItem, OutlinedInput, Select } from '@mui/material';

interface Props {
  name: string;
  label: string;
  options: string[];
  hint?: string;
  required?: boolean;
}

/** Multi-select with chips bound to Formik (value is string[]). */
export default function MultiSelectField({ name, label, options, hint, required }: Readonly<Props>) {
  const [field, meta, helpers] = useField<string[]>(name);
  const value = field.value ?? [];
  const showError = Boolean(meta.error && (meta.touched || value.length > 0));
  return (
    <FormControl fullWidth size="small" error={showError} required={required}>
      <InputLabel>{label}</InputLabel>
      <Select
        multiple
        value={value}
        onChange={(event) => helpers.setValue(typeof event.target.value === 'string' ? event.target.value.split(',') : event.target.value)}
        onBlur={() => helpers.setTouched(true)}
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
      <FormHelperText>{showError ? meta.error : (hint ?? ' ')}</FormHelperText>
    </FormControl>
  );
}
