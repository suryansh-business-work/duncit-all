import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { FormControlLabel, FormHelperText, Stack, Switch } from '@mui/material';

interface RhfSwitchProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  hint?: string;
  disabled?: boolean;
}

/** An on/off setting bound to the form, its hint read out as the switch's description. */
export default function RhfSwitch<T extends FieldValues>({ control, name, label, hint, disabled }: Readonly<RhfSwitchProps<T>>) {
  const hintId = hint ? `${name}-hint` : undefined;
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Stack>
          <FormControlLabel
            label={label}
            disabled={disabled}
            control={
              <Switch
                checked={Boolean(field.value)}
                onChange={(_event, checked) => field.onChange(checked)}
                onBlur={field.onBlur}
                slotProps={{ input: { ref: field.ref, 'aria-describedby': hintId } }}
              />
            }
          />
          {hint && (
            <FormHelperText id={hintId} sx={{ mt: 0, ml: 6 }}>
              {hint}
            </FormHelperText>
          )}
        </Stack>
      )}
    />
  );
}
