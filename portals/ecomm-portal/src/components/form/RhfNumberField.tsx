import type { Control, FieldValues, Path } from 'react-hook-form';
import { InputAdornment } from '@mui/material';
import { RhfTextField } from '@duncit/forms';

interface RhfNumberFieldProps<T extends FieldValues> {
  control: Control<T>;
  /** Holds the number as text — the form's rules check it, the submit converts it. */
  name: Path<T>;
  label: string;
  hint?: string;
  /** Whole numbers only (a count of days, units, uses). */
  whole?: boolean;
  /** A unit shown after the value, e.g. `%` or `days`. */
  unit?: string;
  required?: boolean;
  /** Stable hook for tests on the field's root. */
  testId?: string;
}

/** A number box that brings up the numeric keypad on a phone and names its unit. */
export default function RhfNumberField<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  whole,
  unit,
  required,
  testId,
}: Readonly<RhfNumberFieldProps<T>>) {
  const endAdornment = unit ? <InputAdornment position="end">{unit}</InputAdornment> : undefined;
  return (
    <RhfTextField
      control={control}
      name={name}
      label={label}
      hint={hint}
      required={required}
      data-testid={testId}
      slotProps={{
        htmlInput: { inputMode: whole ? 'numeric' : 'decimal' },
        input: { endAdornment },
      }}
    />
  );
}
