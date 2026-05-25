import { useField } from 'formik';
import { Box, Checkbox, FormControlLabel, FormGroup, FormLabel, Stack } from '@mui/material';

interface Props {
  name: string;
  label: string;
  options: string[];
}

/** Checkbox grid bound to Formik (value is string[]). */
export default function CheckboxGroupField({ name, label, options }: Props) {
  const [field, , helpers] = useField<string[]>(name);
  const value = field.value ?? [];
  const toggle = (option: string) => {
    helpers.setValue(value.includes(option) ? value.filter((v) => v !== option) : [...value, option]);
  };
  return (
    <Stack spacing={0.5}>
      <FormLabel sx={{ fontSize: 13 }}>{label}</FormLabel>
      <FormGroup>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' }, gap: 0 }}>
          {options.map((option) => (
            <FormControlLabel
              key={option}
              control={<Checkbox size="small" checked={value.includes(option)} onChange={() => toggle(option)} />}
              label={option}
              componentsProps={{ typography: { variant: 'body2' } }}
            />
          ))}
        </Box>
      </FormGroup>
    </Stack>
  );
}
