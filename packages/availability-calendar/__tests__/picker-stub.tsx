/**
 * A deterministic stand-in for the MUI X Date/Time pickers (see DayDrawer.test.tsx):
 * a plain input whose value is parsed as a local date-time string, so onChange fires
 * with a real Date (or an Invalid Date, or null) without the real pickers' popups.
 * Unlike the older stubs it also prints the text field's helper text and test id,
 * because the pricing forms put their validation messages there.
 *
 * Use from a test file:
 *   vi.mock('@mui/x-date-pickers/DatePicker', async () => ({ DatePicker: (await import('./picker-stub')).PickerStub }));
 */
interface StubProps {
  label: string;
  value: Date | null;
  onChange: (v: Date | null) => void;
  slotProps?: { textField?: { helperText?: string; 'data-testid'?: string } };
}

export function PickerStub({ label, value, onChange, slotProps }: Readonly<StubProps>) {
  const field = slotProps?.textField;
  return (
    <span>
      <input
        aria-label={label}
        data-testid={field?.['data-testid']}
        value={value && !Number.isNaN(value.getTime()) ? value.toISOString() : ''}
        onChange={(e) => onChange(e.target.value ? new Date(e.target.value) : null)}
      />
      {field?.helperText?.trim() ? <span>{field.helperText}</span> : null}
    </span>
  );
}
