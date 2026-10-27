import { useId } from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { FormControlLabel, FormHelperText, Stack, Switch } from '@mui/material';

interface SwitchFieldProps<T extends FieldValues, TOut> {
  control: Control<T, unknown, TOut>;
  name: Path<T>;
  label: string;
  hint: string;
}

/** An on/off setting with the sentence that says what "on" does, linked to the switch for screen readers. */
export default function SwitchField<T extends FieldValues, TOut>({ control, name, label, hint }: Readonly<SwitchFieldProps<T, TOut>>) {
  const hintId = useId();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { ref, value, onChange, onBlur } }) => (
        <Stack spacing={0.25}>
          <FormControlLabel
            label={label}
            control={
              <Switch
                checked={Boolean(value)}
                onChange={(_event, checked) => onChange(checked)}
                onBlur={onBlur}
                slotProps={{ input: { ref, 'aria-describedby': hintId } }}
              />
            }
          />
          <FormHelperText id={hintId} sx={{ mt: 0, ml: 6 }}>
            {hint}
          </FormHelperText>
        </Stack>
      )}
    />
  );
}
