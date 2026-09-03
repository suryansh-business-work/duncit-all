import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Checkbox, FormControlLabel, FormHelperText, Stack } from '@mui/material';

interface Props<T extends FieldValues> {
  /** react-hook-form control from the parent `useForm`. */
  control: Control<T>;
  /** Typed field name. Its value is a boolean. */
  name: Path<T>;
  label: string;
  /** The line under the box, saying what ticking it actually does. */
  hint?: string;
  'data-testid'?: string;
}

/**
 * MUI checkbox wired into react-hook-form.
 *
 * Written because mWeb had no bound checkbox at all — every tick box was
 * hand-wired to its own `useState` beside the form it belonged to, which is how
 * one ends up validating a value the form does not hold. Its native twin is
 * app/mobile-app/src/forms/components/FormCheckbox.tsx.
 */
export default function RhfCheckbox<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  'data-testid': testId,
}: Readonly<Props<T>>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Stack>
          <FormControlLabel
            label={label}
            slotProps={{ typography: { variant: 'body2' } }}
            control={
              <Checkbox
                size="small"
                checked={field.value === true}
                onChange={(event) => field.onChange(event.target.checked)}
                onBlur={field.onBlur}
                inputProps={{ 'data-testid': testId } as Record<string, string>}
              />
            }
          />
          {hint ? <FormHelperText sx={{ mt: 0 }}>{hint}</FormHelperText> : null}
        </Stack>
      )}
    />
  );
}
