import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { FormControlLabel, FormHelperText, Stack, Switch } from '@mui/material';

/** `TOut` is what the form's resolver transforms the values into; the field only reads and writes `T`. */
export interface RhfSwitchProps<T extends FieldValues, TOut = T> {
  control: Control<T, unknown, TOut>;
  name: Path<T>;
  label: string;
  /** One line under the switch: what turning it on does. */
  hint?: string;
  disabled?: boolean;
}

/**
 * MUI `Switch` wired into react-hook-form for a boolean field. The label is a
 * real `<label>`, so the switch is named for screen readers and the whole row
 * is clickable; the hint is linked through aria-describedby.
 */
export default function RhfSwitch<T extends FieldValues, TOut = T>({ control, name, label, hint, disabled }: Readonly<RhfSwitchProps<T, TOut>>) {
  const hintId = hint ? `${String(name)}-hint` : undefined;
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { ref, value, onChange, onBlur } }) => (
        <Stack>
          <FormControlLabel
            control={<Switch checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} onBlur={onBlur} disabled={disabled} slotProps={{ input: { ref, 'aria-describedby': hintId } }} />}
            label={label}
          />
          {hint && (
            <FormHelperText id={hintId} sx={{ mt: -0.5, ml: 0 }}>
              {hint}
            </FormHelperText>
          )}
        </Stack>
      )}
    />
  );
}
