import type { FieldValues } from 'react-hook-form';
import { MenuItem } from '@mui/material';
import { RhfTextField, type RhfTextFieldProps } from '@duncit/forms';

interface Props<T extends FieldValues> extends Omit<RhfTextFieldProps<T>, 'select' | 'children'> {
  options: readonly { value: string; label: string }[];
}

/** A labelled select wired into react-hook-form — one per enum the inspector edits. */
export default function RhfSelectField<T extends FieldValues>({ options, ...rest }: Readonly<Props<T>>) {
  return (
    <RhfTextField {...rest} select size="small">
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </RhfTextField>
  );
}
