import { useState, type ReactNode } from 'react';
import { emptyBrandingForm, type BrandingFormState } from '../queries';

interface FormHarnessProps {
  initial?: Partial<BrandingFormState>;
  /** Called with every form the section writes, so a test can assert on it. */
  onForm: (form: BrandingFormState) => void;
  children: (form: BrandingFormState, setForm: (next: BrandingFormState) => void) => ReactNode;
}

/**
 * Owns the branding form the way BrandingPage does, so a section can be
 * mounted on its own and still see its own writes come back as props.
 */
export function FormHarness({ initial, onForm, children }: Readonly<FormHarnessProps>) {
  const [form, setFormState] = useState<BrandingFormState>({ ...emptyBrandingForm, ...initial });
  const setForm = (next: BrandingFormState) => {
    onForm(next);
    setFormState(next);
  };
  return <>{children(form, setForm)}</>;
}

/** The stubbed MediaPickerField: a plain input carrying the same value/onChange contract. */
export function MediaPickerFieldStub({
  label,
  value,
  onChange,
  helperText,
}: Readonly<{ label: string; value: string; onChange: (url: string) => void; helperText?: string }>) {
  return (
    <span>
      <input aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} />
      {helperText}
    </span>
  );
}
