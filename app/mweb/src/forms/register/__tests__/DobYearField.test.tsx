import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { latestEligibleBirthYear } from '@duncit/datetime';
import { describe, expect, it } from 'vitest';
import DobYearField from '../DobYearField';
import { registerDefaults, type RegisterFormValues } from '../register.types';
import { DuncitLocalizationProvider } from '@duncit/app-settings';
import { MockedProvider } from '@apollo/client/testing/react';

/** The newest year the list may offer, computed the way the field does. */
const NEWEST = latestEligibleBirthYear(18);

function Harness({ initialYear = '' }: Readonly<{ initialYear?: string }>) {
  const { control, watch, setError } = useForm<RegisterFormValues, any, RegisterFormValues>({
    defaultValues: { ...registerDefaults, dobYear: initialYear },
  });
  const dobYear = watch('dobYear');
  return (
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[]}>
      <DuncitLocalizationProvider>
        <div>
          <DobYearField control={control} minAge={18} />
          <span data-testid="dob-value">{dobYear}</span>
          <button
            type="button"
            onClick={() => setError('dobYear', { message: 'Boom bad year' })}
          >
            trigger-error
          </button>
        </div>
      </DuncitLocalizationProvider>
    </MockedProvider>
  );
}

describe('DobYearField', () => {
  it('renders the birth-year picker with the minimum-age hint', () => {
    render(<Harness />);
    expect(screen.getByLabelText(/birth year/i)).toBeInTheDocument();
    expect(screen.getByText(/at least 18 years old/i)).toBeInTheDocument();
  });

  it('seeds the displayed value from an existing year', () => {
    render(<Harness initialYear="2000" />);
    expect(screen.getByLabelText(/birth year/i)).toHaveValue('2000');
  });

  it('offers the newest eligible year and nothing younger', () => {
    render(<Harness />);
    const years = screen
      .getAllByRole('option')
      .map((o) => Number(o.textContent))
      .filter((n) => Number.isFinite(n) && n > 0);
    // An ineligible year is not merely rejected — it is not on the list, so the
    // age rule never has to tell a new member off for a choice we offered.
    expect(Math.max(...years)).toBe(NEWEST);
    expect(years).not.toContain(NEWEST + 1);
  });

  it('stores the chosen year as a plain four-digit string', () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText(/birth year/i), { target: { value: '1990' } });
    expect(screen.getByTestId('dob-value')).toHaveTextContent('1990');
  });

  it('shows the validation error instead of the hint when the field errors', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: /trigger-error/i }));
    expect(screen.getByText('Boom bad year')).toBeInTheDocument();
    expect(screen.queryByText(/at least 18 years old/i)).not.toBeInTheDocument();
  });
});
