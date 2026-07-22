import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import LocationSelect from '../LocationSelect';
import { accountEditDefaults, type AccountEditValues } from '../account-edit.types';

function Harness({ initial }: Readonly<{ initial?: Partial<AccountEditValues> }>) {
  const { control, setValue } = useForm<AccountEditValues>({
    defaultValues: accountEditDefaults(initial ?? {}),
  });
  return <LocationSelect control={control} setValue={setValue} />;
}

const inputByLabel = (label: string) =>
  screen.getByLabelText(label, { selector: 'input' }) as HTMLInputElement;

describe('LocationSelect', () => {
  it('renders the three location fields with the section heading', () => {
    render(<Harness />);
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(inputByLabel('Country')).toBeInTheDocument();
    expect(inputByLabel('State')).toBeInTheDocument();
    expect(inputByLabel('City')).toBeInTheDocument();
    expect(
      screen.getByText('Your city — used to surface pods and clubs near you.'),
    ).toBeInTheDocument();
  });

  it('disables the State field until a country is chosen', () => {
    render(<Harness />);
    expect(inputByLabel('State')).toBeDisabled();
  });

  it('reflects saved values that are still selectable via withCurrent', () => {
    render(<Harness initial={{ country: 'India', state: 'Maharashtra', city: 'Pune' }} />);
    expect(inputByLabel('Country').value).toBe('India');
    expect(inputByLabel('State').value).toBe('Maharashtra');
    expect(inputByLabel('City').value).toBe('Pune');
    // State enabled once a country is present.
    expect(inputByLabel('State')).not.toBeDisabled();
  });

  it('keeps a saved country that is absent from the dataset selectable', () => {
    render(<Harness initial={{ country: 'Neverland' }} />);
    expect(inputByLabel('Country').value).toBe('Neverland');
  });

  it('selecting a country populates State options and clears state/city', () => {
    render(<Harness initial={{ state: 'Stale', city: 'StaleCity' }} />);
    const countryInput = inputByLabel('Country');

    fireEvent.mouseDown(countryInput);
    fireEvent.change(countryInput, { target: { value: 'India' } });
    const listbox = screen.getByRole('listbox');
    fireEvent.click(within(listbox).getByText('India'));

    expect(inputByLabel('Country').value).toBe('India');
    // Country change resets state + city.
    expect(inputByLabel('State').value).toBe('');
    expect(inputByLabel('City').value).toBe('');
    expect(inputByLabel('State')).not.toBeDisabled();
  });

  it('selecting a state writes the chosen state value', () => {
    render(<Harness initial={{ country: 'India' }} />);
    const stateInput = inputByLabel('State');

    fireEvent.mouseDown(stateInput);
    fireEvent.change(stateInput, { target: { value: 'Maharashtra' } });
    const listbox = screen.getByRole('listbox');
    fireEvent.click(within(listbox).getByText('Maharashtra'));

    expect(inputByLabel('State').value).toBe('Maharashtra');
  });

  it('clearing the country via onChange writes an empty string', () => {
    render(<Harness initial={{ country: 'India' }} />);
    const countryInput = inputByLabel('Country');
    fireEvent.mouseDown(countryInput);
    // Clear button is rendered when a value is present.
    const clearButton = screen.getByLabelText('Clear');
    fireEvent.click(clearButton);
    expect(inputByLabel('Country').value).toBe('');
  });

  it('typing in the City field updates its value', () => {
    render(<Harness />);
    const cityInput = inputByLabel('City');
    fireEvent.change(cityInput, { target: { value: 'Bengaluru' } });
    expect(inputByLabel('City').value).toBe('Bengaluru');
  });
});
