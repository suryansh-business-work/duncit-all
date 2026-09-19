import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { FormControl, FormControlLabel, FormHelperText, Switch } from '@mui/material';

interface Props<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  hint?: string;
  disabled?: boolean;
  testId?: string;
}

/** A labelled MUI Switch wired into react-hook-form, with its hint underneath. */
export function RhfSwitch<T extends FieldValues>({ control, name, label, hint, disabled, testId }: Readonly<Props<T>>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <FormControl disabled={disabled}>
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(field.value)}
                onChange={(event) => field.onChange(event.target.checked)}
                onBlur={field.onBlur}
                inputRef={field.ref}
                slotProps={{ input: { 'data-testid': testId } as never }}
              />
            }
            label={label}
          />
          {hint && <FormHelperText sx={{ mt: -0.5 }}>{hint}</FormHelperText>}
        </FormControl>
      )}
    />
  );
}
