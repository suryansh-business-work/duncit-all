import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import DobYearField from '../DobYearField';
import type { RegisterFormValues } from '../register.types';

function Harness({
  initialDob = '',
  withError = false,
}: Readonly<{ initialDob?: string; withError?: boolean }>) {
  const { control, watch, setError } = useForm<RegisterFormValues>({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      dob: initialDob,
    },
  });
  const dob = watch('dob');
  return (
    <div>
      <DobYearField control={control} minYear={1940} maxYear={2012} />
      <span data-testid="dob-value">{dob}</span>
      <button
        type="button"
        onClick={() => setError('dob', { message: 'Boom bad year' })}
      >
        trigger-error
      </button>
    </div>
  );
}

describe('DobYearField', () => {
  it('renders the birth-year picker with the admin-bounds hint', () => {
    render(<Harness />);
    expect(screen.getByLabelText(/birth year/i)).toBeInTheDocument();
    expect(screen.getByText('Between 1940 and 2012')).toBeInTheDocument();
  });

  it('seeds the displayed value from an existing YYYY-01-01 dob', () => {
    render(<Harness initialDob="2000-01-01" />);
    expect(screen.getByLabelText(/birth year/i)).toHaveValue('2000');
  });

  it('writes a YYYY-01-01 string when a year is chosen from the picker', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: /choose date/i }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('radio', { name: '1990' }));
    expect(screen.getByTestId('dob-value')).toHaveTextContent('1990-01-01');
  });

  it('shows the validation error message instead of the hint when the field errors', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: /trigger-error/i }));
    expect(screen.getByText('Boom bad year')).toBeInTheDocument();
    expect(screen.queryByText('Between 1940 and 2012')).not.toBeInTheDocument();
  });
});
