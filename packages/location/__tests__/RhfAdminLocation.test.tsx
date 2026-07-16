import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, useWatch, type Control } from 'react-hook-form';
import { RhfAdminLocation } from '../src/RhfAdminLocation';
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
    location_zones: [{ zone_name: 'Indiranagar', zone_code: 'IND', pincode: '560038' }],
  },
];

interface FormValues {
  location: AdminLocationValue | undefined;
}

function TestForm({ defaultValue }: Readonly<{ defaultValue?: AdminLocationValue }>) {
  const { control, setError } = useForm<FormValues>({ defaultValues: { location: defaultValue } });
  const watched = useWatch({ control, name: 'location' });
  return (
    <>
      <RhfAdminLocation control={control as Control<FormValues>} name="location" />
      <button type="button" onClick={() => setError('location', { type: 'manual', message: 'Custom message' })}>
        set-error-with-message
      </button>
      <button type="button" onClick={() => setError('location', { type: 'manual' })}>
        set-error-no-message
      </button>
      <div data-testid="watched">{JSON.stringify(watched ?? null)}</div>
    </>
  );
}

const combo = (label: string) => screen.getByRole('combobox', { name: label }) as HTMLInputElement;

describe('RhfAdminLocation', () => {
  beforeEach(() => {
    useAdminLocationsMock.mockReset();
    useAdminLocationsMock.mockReturnValue({ locations, loading: false });
  });

  it('falls back to EMPTY_LOCATION when the field value is undefined', () => {
    render(<TestForm defaultValue={undefined} />);
    expect(combo('Country').value).toBe('');
    expect(JSON.parse(screen.getByTestId('watched').textContent ?? 'null')).toBeNull();
  });

  it("renders the field's existing value through the picker", () => {
    render(
      <TestForm
        defaultValue={{
          location_id: 'loc-blr',
          country: 'India',
          country_code: 'IN',
          state: 'Karnataka',
          state_code: 'KA',
          city: 'Bengaluru',
          locality: 'Indiranagar',
          pincode: '560038',
        }}
      />,
    );
    expect(combo('Country').value).toBe('India');
    expect(combo('City').value).toBe('Bengaluru');
  });

  it('wires a selection back into the form field value', async () => {
    render(<TestForm defaultValue={EMPTY_LOCATION} />);
    await userEvent.click(combo('Country'));
    await userEvent.click(await screen.findByRole('option', { name: 'India' }));
    const watched = JSON.parse(screen.getByTestId('watched').textContent ?? 'null');
    expect(watched).toMatchObject({ country: 'India', country_code: 'IN' });
  });

  it('surfaces a custom field error under the City field only', async () => {
    render(<TestForm defaultValue={EMPTY_LOCATION} />);
    await userEvent.click(screen.getByRole('button', { name: 'set-error-with-message' }));
    expect(await screen.findByText('Custom message')).toBeInTheDocument();
  });

  it('defaults the error message to "Required" when the RHF error has no message', async () => {
    render(<TestForm defaultValue={EMPTY_LOCATION} />);
    await userEvent.click(screen.getByRole('button', { name: 'set-error-no-message' }));
    expect(await screen.findByText('Required')).toBeInTheDocument();
  });
});
