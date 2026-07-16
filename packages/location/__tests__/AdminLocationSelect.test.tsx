import { useState } from 'react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminLocationSelect, type AdminLocationSelectProps } from '../src/AdminLocationSelect';
import { useAdminLocations } from '../src/queries';
import { EMPTY_LOCATION, type AdminLocationValue } from '../src/types';
import type { LocationDoc } from '../src/types';

vi.mock('../src/queries', () => ({ useAdminLocations: vi.fn() }));

const useAdminLocationsMock = useAdminLocations as unknown as Mock;

const locations: LocationDoc[] = [
  {
    id: 'loc-blr',
    country: 'India',
    country_code: 'IN',
    state: 'Karnataka',
    state_code: 'KA',
    city: 'Bengaluru',
    location_pincode: '560001',
    location_zones: [
      { zone_name: 'Indiranagar', zone_code: 'IND', pincode: '560038' },
      { zone_name: 'Koramangala', zone_code: 'KOR', pincode: '' },
    ],
  },
  {
    id: 'loc-pune',
    country: 'India',
    country_code: 'IN',
    state: 'Maharashtra',
    state_code: 'MH',
    city: 'Pune',
    location_pincode: '411001',
    location_zones: [],
  },
];

function Harness({
  initialValue = EMPTY_LOCATION,
  ...props
}: Readonly<Partial<AdminLocationSelectProps> & { initialValue?: AdminLocationValue }>) {
  const [value, setValue] = useState<AdminLocationValue>(initialValue);
  return (
    <>
      <AdminLocationSelect value={value} onChange={setValue} {...props} />
      <div data-testid="value">{JSON.stringify(value)}</div>
    </>
  );
}

const combo = (label: string) => screen.getByRole('combobox', { name: label }) as HTMLInputElement;
const currentValue = (): AdminLocationValue => JSON.parse(screen.getByTestId('value').textContent ?? '{}');

async function pick(label: string, optionName: string) {
  await userEvent.click(combo(label));
  await userEvent.click(await screen.findByRole('option', { name: optionName }));
}

async function clear(label: string) {
  const root = combo(label).closest('.MuiAutocomplete-root') as HTMLElement;
  await userEvent.click(within(root).getByLabelText('Clear'));
}

describe('AdminLocationSelect', () => {
  beforeEach(() => {
    useAdminLocationsMock.mockReset();
    useAdminLocationsMock.mockReturnValue({ locations, loading: false });
  });

  it('only enables Country until parent selections cascade down', () => {
    render(<Harness />);
    expect(combo('Country')).not.toBeDisabled();
    expect(combo('State')).toBeDisabled();
    expect(combo('City')).toBeDisabled();
    expect(combo('Locality')).toBeDisabled();
  });

  it('enables State once a country is picked, and resets deeper fields', async () => {
    render(<Harness />);
    await pick('Country', 'India');
    expect(currentValue()).toMatchObject({ country: 'India', country_code: 'IN', state: '', city: '' });
    expect(combo('State')).not.toBeDisabled();
    expect(combo('City')).toBeDisabled();
  });

  it('cascades country -> state -> city -> locality, taking the zone pincode', async () => {
    render(<Harness />);
    await pick('Country', 'India');
    await pick('State', 'Karnataka');
    await pick('City', 'Bengaluru');
    await pick('Locality', 'Indiranagar');
    expect(currentValue()).toMatchObject({
      location_id: 'loc-blr',
      city: 'Bengaluru',
      locality: 'Indiranagar',
      pincode: '560038',
    });
  });

  it('falls back to the city pincode when the chosen zone has no pincode of its own', async () => {
    render(<Harness />);
    await pick('Country', 'India');
    await pick('State', 'Karnataka');
    await pick('City', 'Bengaluru');
    await pick('Locality', 'Koramangala');
    expect(currentValue()).toMatchObject({ locality: 'Koramangala', pincode: '560001' });
  });

  it('resets city/locality/pincode when the state changes', async () => {
    render(<Harness />);
    await pick('Country', 'India');
    await pick('State', 'Karnataka');
    await pick('City', 'Bengaluru');
    await pick('State', 'Maharashtra');
    expect(currentValue()).toMatchObject({ state: 'Maharashtra', city: '', location_id: '', locality: '', pincode: '' });
    expect(combo('City')).not.toBeDisabled();
  });

  it('resets locality/pincode when the city changes to one with no zones', async () => {
    render(<Harness />);
    await pick('Country', 'India');
    await pick('State', 'Maharashtra');
    await pick('City', 'Pune');
    expect(currentValue()).toMatchObject({ location_id: 'loc-pune', locality: '', pincode: '411001' });
  });

  it('clearing the country resets the whole value', async () => {
    render(<Harness />);
    await pick('Country', 'India');
    await clear('Country');
    expect(currentValue()).toEqual(EMPTY_LOCATION);
    expect(combo('State')).toBeDisabled();
  });

  it('clearing the state resets city/locality/pincode but keeps the country', async () => {
    render(<Harness />);
    await pick('Country', 'India');
    await pick('State', 'Karnataka');
    await clear('State');
    expect(currentValue()).toMatchObject({ country: 'India', state: '', city: '', location_id: '', locality: '', pincode: '' });
    expect(combo('City')).toBeDisabled();
  });

  it('clearing the city resets locality/pincode but keeps the state', async () => {
    render(<Harness />);
    await pick('Country', 'India');
    await pick('State', 'Karnataka');
    await pick('City', 'Bengaluru');
    await clear('City');
    expect(currentValue()).toMatchObject({ state: 'Karnataka', city: '', location_id: '', locality: '', pincode: '' });
    expect(combo('Locality')).toBeDisabled();
  });

  it('clearing the locality keeps the city pincode as the fallback', async () => {
    render(<Harness />);
    await pick('Country', 'India');
    await pick('State', 'Karnataka');
    await pick('City', 'Bengaluru');
    await pick('Locality', 'Indiranagar');
    await clear('Locality');
    expect(currentValue()).toMatchObject({ locality: '', pincode: '560001' });
  });

  // MUI's own outlined inputs render internal `<fieldset class="MuiOutlinedInput-notchedOutline">`
  // borders, so the Fieldset wrapper must be told apart from those.
  const ownFieldsets = (container: HTMLElement) =>
    Array.from(container.querySelectorAll('fieldset')).filter(
      (el) => !el.classList.contains('MuiOutlinedInput-notchedOutline'),
    );

  it('wraps the fields in a legend/hint Fieldset when legend is given', () => {
    const { container } = render(<Harness legend="Location" hint="Powers the map" />);
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('Powers the map')).toBeInTheDocument();
    expect(ownFieldsets(container)).toHaveLength(1);
  });

  it('renders without a fieldset wrapper when no legend is given', () => {
    const { container } = render(<Harness />);
    expect(ownFieldsets(container)).toHaveLength(0);
  });

  it('renders only the requested subset of fields, in fixed cascade order', () => {
    render(<Harness fields={['city', 'country']} />);
    expect(screen.getAllByRole('combobox').map((el) => el.getAttribute('id'))).toHaveLength(2);
    expect(screen.getByRole('combobox', { name: 'Country' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'City' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'State' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Locality' })).not.toBeInTheDocument();
  });

  it('supports a custom label for one field while others keep their default', () => {
    render(<Harness labels={{ city: 'Town' }} />);
    expect(screen.getByRole('combobox', { name: 'Town' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Country' })).toBeInTheDocument();
  });

  it('shows a field-level error message for the field it targets, not the others', () => {
    render(<Harness errors={{ country: 'Country is required' }} />);
    expect(screen.getByText('Country is required')).toBeInTheDocument();
  });

  it('force-disables every field when disabled is true, even Country', () => {
    render(<Harness disabled />);
    expect(combo('Country')).toBeDisabled();
    expect(combo('State')).toBeDisabled();
  });

  it('renders while the admin location list is still loading', () => {
    useAdminLocationsMock.mockReturnValue({ locations: [], loading: true });
    render(<Harness />);
    expect(combo('Country')).toBeInTheDocument();
  });
});
