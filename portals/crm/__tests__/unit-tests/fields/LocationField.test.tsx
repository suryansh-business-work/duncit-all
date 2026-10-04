import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { FormProvider, useForm } from 'react-hook-form';
import { ADMIN_LOCATIONS, type LocationDoc } from '@duncit/location';
import { AreaField, CityField, LocationFieldset } from '@/forms/fields/LocationField';
import { renderWithApollo } from '../helpers/renderWithApollo';

const location = (overrides: Partial<LocationDoc>): LocationDoc => ({
  id: 'loc',
  location_name: null,
  country: 'India',
  country_code: 'IN',
  state: 'Maharashtra',
  state_code: 'MH',
  city: 'Pune',
  location_pincode: '411001',
  location_zones: [],
  ...overrides,
});

const LOCATIONS: LocationDoc[] = [
  location({
    id: 'pune',
    city: 'Pune',
    location_zones: [
      { zone_name: 'Kothrud', zone_code: 'KTH', pincode: '411038' },
      { zone_name: 'Aundh', zone_code: 'AUN', pincode: '411007' },
    ],
  }),
  location({ id: 'mumbai', city: 'Mumbai', location_zones: [{ zone_name: 'Bandra', zone_code: 'BAN', pincode: '400050' }] }),
];

const locationsMock: MockedResponse = {
  request: { query: ADMIN_LOCATIONS },
  result: { data: { locations: LOCATIONS } },
};

type Values = Record<string, string | undefined>;

/** Mounts `children` in a form whose values are printed for assertions. */
function Harness({ initial, children }: Readonly<{ initial: Values; children: React.ReactNode }>) {
  const methods = useForm<Values>({ defaultValues: initial });
  const values = methods.watch();
  return (
    <FormProvider {...methods}>
      {children}
      <button type="button" onClick={() => methods.setError('venue_city', { message: 'City is required' })}>
        flag city
      </button>
      <button type="button" onClick={() => methods.setError('area', { message: 'Pick an area' })}>
        flag area
      </button>
      <output data-testid="values">{JSON.stringify(values)}</output>
    </FormProvider>
  );
}

const values = () => JSON.parse(screen.getByTestId('values').textContent ?? '{}') as Values;

const options = async (label: RegExp) => {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: label }));
  return within(await screen.findByRole('listbox')).getAllByRole('option').map((o) => o.textContent);
};

const pick = async (label: RegExp, option: string) => {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: label }));
  fireEvent.click(within(await screen.findByRole('listbox')).getByRole('option', { name: option }));
};

describe('LocationFieldset', () => {
  it('offers only admin cities, and a chosen city scopes the area list', async () => {
    renderWithApollo(
      <Harness initial={{ city: '', area: '' }}>
        <LocationFieldset />
      </Harness>,
      [locationsMock],
    );

    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Area \/ Locality/ })).toBeDisabled();
    await waitFor(async () => expect(await options(/City/)).toEqual(['Mumbai', 'Pune']));
    fireEvent.click(screen.getByRole('option', { name: 'Pune' }));

    expect(values()).toEqual({ city: 'Pune', area: '' });
    expect(screen.getByRole('combobox', { name: /Area \/ Locality/ })).toBeEnabled();
    expect(await options(/Area \/ Locality/)).toEqual(['Aundh', 'Kothrud']);
    fireEvent.click(screen.getByRole('option', { name: 'Kothrud' }));
    expect(values()).toEqual({ city: 'Pune', area: 'Kothrud' });
  });

  it('clears the paired area when the city changes', async () => {
    renderWithApollo(
      <Harness initial={{ city: 'Pune', area: 'Aundh' }}>
        <LocationFieldset />
      </Harness>,
      [locationsMock],
    );

    await waitFor(async () => expect(await options(/City/)).toContain('Mumbai'));
    fireEvent.click(screen.getByRole('option', { name: 'Mumbai' }));

    expect(values()).toEqual({ city: 'Mumbai', area: '' });
  });
});

describe('CityField', () => {
  it('pairs a prefixed city with its prefixed area, and clears both on reset', async () => {
    renderWithApollo(
      <Harness initial={{ venue_city: 'Pune', venue_area: 'Aundh' }}>
        <CityField name="venue_city" label="Venue city" required={false} />
      </Harness>,
      [locationsMock],
    );

    expect(screen.getByRole('combobox', { name: 'Venue city' })).toHaveValue('Pune');
    fireEvent.click(screen.getByTitle('Clear'));

    expect(values()).toEqual({ venue_city: '', venue_area: '' });
  });

  it('shows its validation error in place of the blank helper line', () => {
    renderWithApollo(
      <Harness initial={{ venue_city: '' }}>
        <CityField name="venue_city" label="Venue city" />
      </Harness>,
      [locationsMock],
    );

    fireEvent.click(screen.getByRole('button', { name: 'flag city' }));

    expect(screen.getByRole('combobox', { name: 'Venue city' })).toHaveAccessibleDescription('City is required');
    expect(screen.getByRole('combobox', { name: 'Venue city' })).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('AreaField', () => {
  it('stays disabled with no options while its city field is missing from the form', () => {
    renderWithApollo(
      <Harness initial={{}}>
        <AreaField name="area" cityField="city" label="Area" />
      </Harness>,
      [locationsMock],
    );

    expect(screen.getByRole('combobox', { name: 'Area' })).toBeDisabled();
  });

  it('offers nothing for a city that is not in the admin list, and shows its error', async () => {
    renderWithApollo(
      <Harness initial={{ city: 'Atlantis', area: '' }}>
        <AreaField name="area" cityField="city" label="Area" />
      </Harness>,
      [locationsMock],
    );

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Area' }));
    expect(await screen.findByText('No options')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'flag area' }));
    expect(screen.getByRole('combobox', { name: 'Area' })).toHaveAccessibleDescription('Pick an area');
  });

  it('writes the chosen area and clears it again', async () => {
    renderWithApollo(
      <Harness initial={{ city: 'mumbai', area: '' }}>
        <AreaField name="area" cityField="city" label="Area" />
      </Harness>,
      [locationsMock],
    );

    // City matching is case-insensitive.
    await waitFor(async () => expect(await options(/Area/)).toEqual(['Bandra']));
    fireEvent.click(screen.getByRole('option', { name: 'Bandra' }));
    expect(values()).toEqual({ city: 'mumbai', area: 'Bandra' });

    fireEvent.click(screen.getByTitle('Clear'));
    expect(values()).toEqual({ city: 'mumbai', area: '' });
  });
});
