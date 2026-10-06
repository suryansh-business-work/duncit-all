/**
 * The State → City → Pincode cascade on the admin profile form.
 *
 * The form (react-hook-form) owns the values; this block only reports what was
 * picked or typed through `setFieldValue`. The rules worth holding: choosing a
 * new state clears the city (a Pune left under Goa is a wrong address), the
 * city list is the chosen state's own, a city picked from that list is stored
 * by its name, and a city typed freehand is kept as typed.
 */
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AddressFields from '../AddressFields';
import { renderWithProviders } from './testkit';

const noError = { error: false, helperText: ' ' };

const renderFields = (over: Partial<Parameters<typeof AddressFields>[0]> = {}) => {
  const setFieldValue = vi.fn();
  renderWithProviders(
    <AddressFields
      state=""
      city=""
      pincode=""
      stateError={noError}
      cityError={noError}
      pincodeError={noError}
      setFieldValue={setFieldValue}
      {...over}
    />,
  );
  return setFieldValue;
};

describe('AddressFields', () => {
  it('stores the picked state by name and clears the city that belonged to the old one', () => {
    const setFieldValue = renderFields({ state: 'Maharashtra', city: 'Pune' });

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'State' }));
    fireEvent.click(within(screen.getByRole('listbox')).getByText('Goa'));

    expect(setFieldValue.mock.calls).toEqual([
      ['state', 'Goa'],
      ['city', ''],
    ]);
  });

  it('clears both the state and the city when the state is cleared', () => {
    const setFieldValue = renderFields({ state: 'Goa', city: 'Panaji' });

    // MUI keeps the clear control visually hidden until hover, so it is found by title.
    fireEvent.click(screen.getAllByTitle('Clear')[0]);

    expect(setFieldValue.mock.calls).toEqual([
      ['state', ''],
      ['city', ''],
    ]);
  });

  it('empties the city, and only the city, when the city is cleared', () => {
    const setFieldValue = renderFields({ state: 'Goa', city: 'Panaji' });

    fireEvent.click(screen.getAllByTitle('Clear')[1]);

    expect(setFieldValue).toHaveBeenCalledWith('city', '');
    expect(setFieldValue).not.toHaveBeenCalledWith('state', expect.anything());
  });

  it('keeps the city closed until a state is chosen', () => {
    renderFields();

    expect(screen.getByRole('combobox', { name: 'City' })).toBeDisabled();
  });

  it("offers the chosen state's own cities and stores the picked one by its name", async () => {
    const setFieldValue = renderFields({ state: 'Goa' });

    const cityBox = screen.getByRole('combobox', { name: 'City' });
    fireEvent.mouseDown(cityBox);
    fireEvent.change(cityBox, { target: { value: 'Pana' } });
    const option = await screen.findByRole('option', { name: 'Panaji' });
    // The list is Goa's: a Maharashtra city is not offered.
    expect(screen.queryByRole('option', { name: 'Pune' })).toBeNull();
    setFieldValue.mockClear();

    fireEvent.click(option);

    expect(setFieldValue).toHaveBeenCalledWith('city', 'Panaji');
    expect(setFieldValue).not.toHaveBeenCalledWith('state', expect.anything());
  });

  it('keeps a city typed freehand, as typed, when it is not on the list', async () => {
    const setFieldValue = renderFields({ state: 'Goa' });

    const cityBox = screen.getByRole('combobox', { name: 'City' });
    fireEvent.change(cityBox, { target: { value: 'Old Goa Village' } });
    expect(setFieldValue).toHaveBeenLastCalledWith('city', 'Old Goa Village');

    fireEvent.keyDown(cityBox, { key: 'Enter' });

    await waitFor(() => expect(setFieldValue).toHaveBeenLastCalledWith('city', 'Old Goa Village'));
  });

  it('stores the pincode as typed and shows each field its own error', () => {
    const setFieldValue = renderFields({
      state: 'Goa',
      stateError: { error: true, helperText: 'State must be 80 characters or fewer' },
      cityError: { error: true, helperText: 'City must be 80 characters or fewer' },
      pincodeError: { error: true, helperText: 'Pincode must be 3–12 letters' },
    });

    fireEvent.change(screen.getByRole('textbox', { name: 'Pincode' }), {
      target: { value: '403001' },
    });

    expect(setFieldValue).toHaveBeenCalledWith('pincode', '403001');
    expect(screen.getByText('State must be 80 characters or fewer')).toBeInTheDocument();
    expect(screen.getByText('City must be 80 characters or fewer')).toBeInTheDocument();
    expect(screen.getByText('Pincode must be 3–12 letters')).toBeInTheDocument();
  });
});
