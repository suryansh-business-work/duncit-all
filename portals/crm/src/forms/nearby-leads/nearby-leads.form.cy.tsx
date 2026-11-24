import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NearbyLeadsForm, nearbyLeadsDefaults, nearbyLeadsSchema } from '.';

vi.mock('@duncit/location', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/location')>()),
  useAdminLocations: () => ({
    loading: false,
    locations: [
      {
        id: 'loc-mumbai',
        location_name: 'Mumbai',
        country: 'India',
        country_code: 'IN',
        state: 'Maharashtra',
        state_code: 'MH',
        city: 'Mumbai',
        location_zones: [{ zone_name: 'Bandra' }, { zone_name: 'Andheri' }],
      },
    ],
  }),
}));

// The schema takes the surface's translator; echoing keys keeps the messages assertable.
const schema = nearbyLeadsSchema(((key: string) => key) as Parameters<typeof nearbyLeadsSchema>[0]);
const issues = (values: Record<string, unknown>) => {
  const result = schema.safeParse({ ...nearbyLeadsDefaults, ...values });
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}:${issue.message}`);
};

describe('nearbyLeadsSchema', () => {
  it('accepts a search around my position with no city', () => {
    expect(issues({ source: 'me', city: '' })).toEqual([]);
  });

  it('needs a city when searching around a place, and trims it', () => {
    expect(issues({ source: 'place', city: '  ' })).toEqual(['city:crm.nearby.cityRequired']);
    const parsed = schema.safeParse({ ...nearbyLeadsDefaults, source: 'place', city: ' Mumbai ', area: ' Bandra ' });
    expect(parsed.success && parsed.data).toMatchObject({ city: 'Mumbai', area: 'Bandra' });
  });

  it('keeps the radius inside what the server accepts', () => {
    expect(issues({ radius_km: 0.5 })).toEqual([]);
    expect(issues({ radius_km: 50 })).toEqual([]);
    expect(issues({ radius_km: 0.4 })).toEqual(['radius_km:crm.nearby.radiusRange']);
    expect(issues({ radius_km: 51 })).toEqual(['radius_km:crm.nearby.radiusRange']);
  });

  it('refuses an unknown centre source', () => {
    expect(issues({ source: 'gps' })).toHaveLength(1);
  });
});

describe('NearbyLeadsForm', () => {
  const find = () => fireEvent.click(screen.getByTestId('nearby-find'));

  it('searches around my position at the default 5 km', async () => {
    const onSubmit = vi.fn();
    render(<NearbyLeadsForm onSubmit={onSubmit} />);
    expect(screen.queryByRole('combobox')).toBeNull();
    find();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({ source: 'me', city: '', area: '', radius_km: 5 });
  });

  it('asks for a city before searching around a place', async () => {
    const onSubmit = vi.fn();
    render(<NearbyLeadsForm onSubmit={onSubmit} />);
    fireEvent.click(screen.getByTestId('nearby-source-place'));
    find();
    expect(await screen.findByText('Pick a city')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('searches around a picked city and area', async () => {
    const onSubmit = vi.fn();
    render(<NearbyLeadsForm onSubmit={onSubmit} />);
    fireEvent.click(screen.getByTestId('nearby-source-place'));
    const [city, area] = screen.getAllByRole('combobox');
    fireEvent.mouseDown(city);
    fireEvent.click(within(await screen.findByRole('listbox')).getByText('Mumbai'));
    fireEvent.mouseDown(area);
    fireEvent.click(within(await screen.findByRole('listbox')).getByText('Bandra'));
    find();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({ source: 'place', city: 'Mumbai', area: 'Bandra', radius_km: 5 });
  });

  it('starts from the last search and sends a changed radius', async () => {
    const onSubmit = vi.fn();
    render(<NearbyLeadsForm initialValues={{ source: 'me', city: '', area: '', radius_km: 10 }} onSubmit={onSubmit} />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuenow', '10');
    expect(slider).toHaveAttribute('aria-valuetext', '10 km');
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    find();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].radius_km).toBe(10.5);
  });

  it('labels only radius marks with room for their text, so the low end does not overlap', () => {
    const { container } = render(<NearbyLeadsForm onSubmit={vi.fn()} />);
    const labels = Array.from(container.querySelectorAll('.MuiSlider-markLabel'), (el) => el.textContent);
    expect(labels).toEqual(['1 km', '10 km', '25 km', '50 km']);
    expect(container.querySelectorAll('.MuiSlider-mark')).toHaveLength(6);
  });

  it('keeps one centre source picked: clicking the active one again changes nothing', () => {
    render(<NearbyLeadsForm onSubmit={vi.fn()} />);
    const mine = screen.getByTestId('nearby-source-me');
    expect(mine).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(mine);
    expect(mine).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/will ask to share your location/)).toBeInTheDocument();
  });
});
