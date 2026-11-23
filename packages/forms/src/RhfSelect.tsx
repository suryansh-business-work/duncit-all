import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Checkbox, ListItemText, MenuItem, TextField, type TextFieldProps } from '@mui/material';

export interface RhfSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

type Omitted = 'name' | 'value' | 'onChange' | 'onBlur' | 'error' | 'helperText' | 'select' | 'children';

/** `TOut` is what the form's resolver transforms the values into; the field only reads and writes `T`. */
export interface RhfSelectProps<T extends FieldValues, TOut = T> extends Omit<TextFieldProps, Omitted> {
  control: Control<T, unknown, TOut>;
  name: Path<T>;
  options: readonly RhfSelectOption[];
  /** A `string[]` field: several values, each with a checkbox. */
  multiple?: boolean;
  hint?: string;
}

/**
 * A MUI select (single or multiple) wired into react-hook-form. Shows the Zod
 * message once the field has an error, otherwise the hint — the same contract
 * as `RhfTextField`.
 */
export default function RhfSelect<T extends FieldValues, TOut = T>({ control, name, options, multiple, hint, ...rest }: Readonly<RhfSelectProps<T, TOut>>) {
  const labelOf = (value: string) => options.find((o) => o.value === value)?.label ?? value;
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { ref, value, onChange, onBlur }, fieldState }) => {
        const selected: string[] = Array.isArray(value) ? (value as string[]) : [];
        return (
          <TextField
            {...rest}
            select
            inputRef={ref}
            value={multiple ? selected : (value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            fullWidth={rest.fullWidth ?? true}
            error={!!fieldState.error}
            helperText={fieldState.error?.message ?? hint ?? ' '}
            slotProps={{
              ...rest.slotProps,
              select: multiple ? { multiple: true, renderValue: (v: unknown) => (v as string[]).map(labelOf).join(', ') } : undefined,
            }}
          >
            {options.map((o) => (
              <MenuItem key={o.value} value={o.value} disabled={o.disabled}>
                {multiple && <Checkbox size="small" checked={selected.includes(o.value)} />}
                {multiple ? <ListItemText primary={o.label} /> : o.label}
              </MenuItem>
            ))}
          </TextField>
        );
      }}
    />
  );
}
