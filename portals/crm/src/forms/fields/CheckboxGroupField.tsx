import { Controller, useFormContext } from 'react-hook-form';
import { Box, Checkbox, FormControlLabel, FormGroup, FormLabel, Stack } from '@mui/material';

interface Props {
  name: string;
  label: string;
  options: string[];
}

/** Checkbox grid bound to react-hook-form (value is string[]). */
export default function CheckboxGroupField({ name, label, options }: Readonly<Props>) {
  const { control } = useFormContext();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const value = (field.value as string[]) ?? [];
        const toggle = (option: string) => {
          field.onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option]);
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
      }}
    />
  );
}
