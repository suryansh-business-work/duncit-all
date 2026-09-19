import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { MenuItem, TextField } from '@mui/material';

export interface SelectOption {
  value: string;
  label: string;
}

interface RhfSelectProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  options: readonly SelectOption[];
  /** A first, blank choice with this label (for an optional field). */
  emptyLabel?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  testId?: string;
}

/** A labelled MUI select wired into react-hook-form, with its error or hint under it. */
export function RhfSelect<T extends FieldValues>({ control, name, label, options, emptyLabel, hint, required, disabled, testId }: Readonly<RhfSelectProps<T>>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { ref, ...field }, fieldState }) => (
        <TextField
          {...field}
          inputRef={ref}
          select
          fullWidth
          required={required}
          disabled={disabled}
          label={label}
          value={field.value ?? ''}
          error={Boolean(fieldState.error)}
          helperText={fieldState.error?.message ?? hint ?? ' '}
          slotProps={{ select: { SelectDisplayProps: { 'data-testid': testId } as Record<string, string> } }}
        >
          {emptyLabel === undefined ? null : (
            <MenuItem value="">
              <em>{emptyLabel}</em>
            </MenuItem>
          )}
          {options.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      )}
    />
  );
}
