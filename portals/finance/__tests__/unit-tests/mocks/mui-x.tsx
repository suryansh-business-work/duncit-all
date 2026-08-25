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
  /**
   * The real picker forwards these to the text field it renders, and the
   * validation message is the whole point of the `helperText` one — a stub that
   * dropped it made "clear the date, then read the error" untestable, because
   * the error was never in the DOM to find.
   */
  slotProps?: { textField?: { helperText?: ReactNode; error?: boolean } };
}

function Picker({ label, value, onChange, slotProps }: PickerProps) {
  const field = slotProps?.textField;
  return (
    <>
      <input
        aria-label={label}
        aria-invalid={field?.error ? 'true' : undefined}
        value={value ? value.toISOString() : ''}
        onChange={(e) => onChange?.(e.target.value === '' ? null : new Date(e.target.value))}
      />
      {field?.helperText ? <p>{field.helperText}</p> : null}
    </>
  );
}

export const DatePicker = (props: PickerProps) => <Picker {...props} />;
export const TimePicker = (props: PickerProps) => <Picker {...props} />;
export const LocalizationProvider = ({ children }: { children: ReactNode }) => <>{children}</>;
export const AdapterDateFns = class {};
