import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import LocationHierarchyFields from '../LocationHierarchyFields';
import { blankForm, type LocForm } from '../types';

/** Owns the form the way LocationsPage does and reports every write. */
function Harness({ initial, onForm }: Readonly<{ initial: LocForm; onForm: (form: LocForm) => void }>) {
  const [form, setForm] = useState<LocForm>(initial);
  const setAndReport: React.Dispatch<React.SetStateAction<LocForm>> = (next) => {
    setForm((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      onForm(value);
      return value;
    });
  };
  return <LocationHierarchyFields form={form} setForm={setAndReport} />;
}

const seed = (over: Partial<LocForm> = {}): LocForm => ({
  ...blankForm,
  state: 'Maharashtra',
  state_code: 'MH',
  city: 'Pune',
  location_name: 'Pune',
  ...over,
});

const renderFields = (initial: LocForm = seed()) => {
  const onForm = vi.fn();
  render(<Harness initial={initial} onForm={onForm} />);
  return onForm;
};

const lastForm = (onForm: ReturnType<typeof vi.fn>) => onForm.mock.lastCall?.[0] as LocForm;

const field = (label: RegExp) => screen.getByRole('combobox', { name: label });

describe('LocationHierarchyFields — country', () => {
  it('shows the stored country, and picking another resets state and city', () => {
    const onForm = renderFields();
    expect(field(/^Country/)).toHaveValue('🇮🇳  India');

    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('option', { selected: true })).toHaveTextContent('India');
    fireEvent.change(field(/^Country/), { target: { value: 'Arab Emirates' } });
    fireEvent.click(screen.getByRole('option', { name: /United Arab Emirates/ }));

    expect(lastForm(onForm)).toMatchObject({
      country: 'United Arab Emirates',
      country_code: 'AE',
      state: '',
      state_code: '',
      city: '',
      location_name: '',
    });
  });

  it('clears every level when the country is cleared', () => {
    const onForm = renderFields();
    const countryField = field(/^Country/).closest('.MuiAutocomplete-root') as HTMLElement;

    fireEvent.click(within(countryField).getByRole('button', { name: 'Clear', hidden: true }));

    expect(lastForm(onForm)).toMatchObject({ country: '', country_code: '', state: '', city: '' });
  });
});

describe('LocationHierarchyFields — state', () => {
  it('picks a listed state by name and code', () => {
    const onForm = renderFields(seed({ state: '', state_code: '', city: '', location_name: '' }));

    fireEvent.change(field(/^State/), { target: { value: 'Karnat' } });
    expect(lastForm(onForm)).toMatchObject({ state: 'Karnat', state_code: '' });
    fireEvent.click(screen.getByRole('option', { name: 'Karnataka' }));

    expect(lastForm(onForm)).toMatchObject({ state: 'Karnataka', state_code: 'KA', city: '' });
  });

  it('keeps a state typed by hand that the list does not carry, with no code', () => {
    const onForm = renderFields(seed({ state: '', state_code: '', city: '', location_name: '' }));
    const stateField = field(/^State/);

    fireEvent.change(stateField, { target: { value: 'Konkan Division' } });

    expect(lastForm(onForm)).toMatchObject({ state: 'Konkan Division', state_code: '' });
    expect(stateField).toHaveValue('Konkan Division');
  });

  it('clears the state and the city under it', () => {
    const onForm = renderFields();
    const stateField = field(/^State/).closest('.MuiAutocomplete-root') as HTMLElement;

    fireEvent.click(within(stateField).getByRole('button', { name: 'Clear', hidden: true }));

    expect(lastForm(onForm)).toMatchObject({ state: '', state_code: '', city: '', location_name: '' });
  });
});

describe('LocationHierarchyFields — city', () => {
  it('offers the state’s cities once they load and names the location after the one picked', async () => {
    const onForm = renderFields(seed({ city: '', location_name: '' }));

    fireEvent.change(field(/^City/), { target: { value: 'Nash' } });
    fireEvent.click(await screen.findByRole('option', { name: 'Nashik' }, { timeout: 5000 }));

    expect(lastForm(onForm)).toMatchObject({ city: 'Nashik', location_name: 'Nashik' });
  });

  it('keeps a city typed by hand, and clears it again', async () => {
    const onForm = renderFields(seed({ city: '', location_name: '' }));
    const cityField = field(/^City/);

    fireEvent.change(cityField, { target: { value: 'Lonavala Hills' } });
    expect(lastForm(onForm)).toMatchObject({ city: 'Lonavala Hills', location_name: 'Lonavala Hills' });

    const cityRoot = cityField.closest('.MuiAutocomplete-root') as HTMLElement;
    fireEvent.click(within(cityRoot).getByRole('button', { name: 'Clear', hidden: true }));
    await waitFor(() => expect(lastForm(onForm)).toMatchObject({ city: '', location_name: '' }));
  });
});
