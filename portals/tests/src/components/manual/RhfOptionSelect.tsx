import { MenuItem } from '@mui/material';
import type { FieldValues } from 'react-hook-form';
import { RhfTextField, type RhfTextFieldProps } from '@duncit/forms';

export interface RhfOptionSelectProps<T extends FieldValues> extends Omit<RhfTextFieldProps<T>, 'select' | 'children'> {
  options: ReadonlyArray<{ value: string; label: string }>;
  /** Shown as the first, empty choice — for a field that may be left unset. */
  emptyLabel?: string;
}

/** A react-hook-form select over value/label options (MUI TextField select). */
export function RhfOptionSelect<T extends FieldValues>({ options, emptyLabel, ...rest }: Readonly<RhfOptionSelectProps<T>>) {
  return (
    <RhfTextField<T> {...rest} select>
      {emptyLabel === undefined ? null : <MenuItem value="">{emptyLabel}</MenuItem>}
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </RhfTextField>
  );
}
