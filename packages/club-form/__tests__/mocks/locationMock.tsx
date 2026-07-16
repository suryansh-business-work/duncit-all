/** Stand-in for @duncit/location used by vi.mock in the club-form tests. */
export const EMPTY_LOCATION = {
  location_id: '',
  country: '',
  country_code: '',
  state: '',
  state_code: '',
  city: '',
  locality: '',
  pincode: '',
};

export const useAdminLocations = () => ({ locations: [{ location_id: 'L1' }] });

export const buildLocationValue = (_locations: unknown, locationId: string, locality: string) => ({
  ...EMPTY_LOCATION,
  location_id: locationId,
  locality,
});

interface LocationSelectProps {
  value: { location_id: string; locality: string };
  onChange: (next: Record<string, string>) => void;
  legend: string;
  errors?: { city?: string };
}

export function AdminLocationSelect({ value, onChange, legend, errors }: Readonly<LocationSelectProps>) {
  return (
    <div>
      <span data-testid="loc-legend">{legend}</span>
      <span data-testid="loc-value">{value.location_id}:{value.locality}</span>
      <span data-testid="loc-city-err">{errors?.city}</span>
      <button
        type="button"
        onClick={() => onChange({ ...EMPTY_LOCATION, location_id: 'L9', locality: 'Bandra' })}
      >
        pick-location
      </button>
    </div>
  );
}
