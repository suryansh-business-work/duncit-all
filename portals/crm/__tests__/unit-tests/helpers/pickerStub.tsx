/**
 * Deterministic stand-in for an MUI X date/time picker, for `vi.mock` factories.
 *
 * The real picker's section-by-section typing is MUI's own to test and is not
 * drivable under jsdom; what a CRM form cares about is the value the picker
 * hands back — a Date, an invalid Date (a half-typed entry) or null (cleared).
 * Typing an ISO string yields that Date, any other text an invalid one, and an
 * empty field null.
 */
interface PickerStubProps {
  label: string;
  value: Date | null;
  onChange: (value: Date | null) => void;
}

const shown = (value: Date | null) => (value && !Number.isNaN(value.getTime()) ? value.toISOString() : '');

export function PickerStub({ label, value, onChange }: Readonly<PickerStubProps>) {
  return (
    <input
      aria-label={label}
      value={shown(value)}
      onChange={(e) => onChange(e.target.value ? new Date(e.target.value) : null)}
    />
  );
}
