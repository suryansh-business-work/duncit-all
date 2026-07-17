import type { ReactNode } from 'react';

/**
 * Stubs for the @mui/x-date-pickers subpaths. The real sectioned fields can't be
 * cleared via fireEvent, so these render a plain input whose onChange emits a Date
 * (or null when cleared) — letting tests drive the pickers' null path deterministically.
 */

interface PickerProps {
  label?: string;
  value?: Date | null;
  onChange?: (next: Date | null) => void;
}

function Picker({ label, value, onChange }: PickerProps) {
  return (
    <input
      aria-label={label}
      value={value ? value.toISOString() : ''}
      onChange={(e) => onChange?.(e.target.value === '' ? null : new Date(e.target.value))}
    />
  );
}

export const DatePicker = (props: PickerProps) => <Picker {...props} />;
export const TimePicker = (props: PickerProps) => <Picker {...props} />;
export const LocalizationProvider = ({ children }: { children: ReactNode }) => <>{children}</>;
export const AdapterDateFns = class {};
