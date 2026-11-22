import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import NearbyLeadsControl from '@/components/nearby-leads/NearbyLeadsControl';
import NearbyScanView from '@/components/nearby-leads/NearbyScanView';
import RadarScan from '@/components/nearby-leads/RadarScan';
import { distanceColumn, formatKm, type NearbyRowFields } from '@/components/nearby-leads/distanceColumn';
import type { NearbyLeads, NearbyScan, NearbySearch } from '@/hooks/useNearbyLeads';

vi.mock('@duncit/location', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/location')>()),
  useAdminLocations: () => ({ loading: false, locations: [] }),
}));

const nearbyState = (over: Partial<NearbyLeads> = {}): NearbyLeads => ({
  near: null,
  search: null,
  scan: { phase: 'idle' },
  start: vi.fn(),
  clear: vi.fn(),
  client: { query: vi.fn() },
  ...over,
});

const mine: NearbySearch = { source: 'me', city: '', area: '', radius_km: 5 };

describe('NearbyLeadsControl', () => {
  it('opens the search, hands the chosen search to start, and shows the radar while it runs', async () => {
    const nearby = nearbyState({ scan: { phase: 'searching' }, search: null });
    render(<NearbyLeadsControl nearby={nearby} />);
    fireEvent.click(screen.getByRole('button', { name: 'Nearby leads' }));
    expect(screen.getByRole('dialog', { name: 'Find nearby leads' })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('nearby-find'));
    await waitFor(() => expect(nearby.start).toHaveBeenCalledWith({ source: 'me', city: '', area: '', radius_km: 5 }));
    expect(screen.getByTestId('nearby-radar')).toBeInTheDocument();
  });

  it('names an active search in a chip that reopens it, starting from the last search', () => {
    const nearby = nearbyState({ near: { lat: 1, lng: 2, radius_km: 10 }, search: { ...mine, radius_km: 10 } });
    render(<NearbyLeadsControl nearby={nearby} />);
    expect(screen.queryByRole('button', { name: 'Nearby leads' })).toBeNull();
    fireEvent.click(screen.getByText('Within 10 km of you'));
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '10');
  });

  it('names a picked place, with or without its area', () => {
    const place: NearbySearch = { source: 'place', city: 'Mumbai', area: 'Bandra', radius_km: 3 };
    const { rerender } = render(<NearbyLeadsControl nearby={nearbyState({ search: place })} />);
    expect(screen.getByText('Within 3 km of Bandra, Mumbai')).toBeInTheDocument();
    rerender(<NearbyLeadsControl nearby={nearbyState({ search: { ...place, area: '' } })} />);
    expect(screen.getByText('Within 3 km of Mumbai')).toBeInTheDocument();
  });

  it('lists every lead again when the chip is removed', () => {
    const nearby = nearbyState({ search: mine });
    render(<NearbyLeadsControl nearby={nearby} />);
    fireEvent.click(screen.getByLabelText('Show all leads'));
    expect(nearby.clear).toHaveBeenCalledTimes(1);
  });

  it('closes on View leads, goes back to the form on Change search, and closes from the title button', async () => {
    const nearby = nearbyState({ search: mine, scan: { phase: 'done', total: 2, unplaced: 0 } });
    render(<NearbyLeadsControl nearby={nearby} />);
    fireEvent.click(screen.getByText('Within 5 km of you'));
    fireEvent.click(screen.getByTestId('nearby-find'));
    fireEvent.click(await screen.findByTestId('nearby-change'));
    expect(screen.getByTestId('nearby-leads-form')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('nearby-find'));
    fireEvent.click(await screen.findByTestId('nearby-view'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    fireEvent.click(screen.getByText('Within 5 km of you'));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});

describe('NearbyScanView', () => {
  const view = (scan: NearbyScan, radiusKm = 5) => {
    const onChangeSearch = vi.fn();
    const onViewLeads = vi.fn();
    render(<NearbyScanView scan={scan} radiusKm={radiusKm} onChangeSearch={onChangeSearch} onViewLeads={onViewLeads} />);
    return { onChangeSearch, onViewLeads };
  };

  it('sweeps the radar while locating and while searching, announcing each step', () => {
    view({ phase: 'locating' });
    expect(screen.getByRole('status')).toHaveTextContent('Getting your location…');
    screen.getByTestId('nearby-radar');
  });

  it('names the radius while searching', () => {
    view({ phase: 'searching' }, 2.5);
    expect(screen.getByRole('status')).toHaveTextContent('Finding leads within 2.5 km…');
  });

  it('counts what was found, singular and plural, and offers the leads', () => {
    const { onViewLeads } = view({ phase: 'done', total: 1, unplaced: null });
    expect(screen.getByTestId('nearby-result')).toHaveTextContent('1 lead within 5 km');
    fireEvent.click(screen.getByTestId('nearby-view'));
    expect(onViewLeads).toHaveBeenCalled();
  });

  it('says how many leads cannot be placed', () => {
    view({ phase: 'done', total: 12, unplaced: 3 });
    expect(screen.getByTestId('nearby-result')).toHaveTextContent('12 leads within 5 km');
    expect(screen.getByTestId('nearby-unplaced')).toHaveTextContent('3 leads of this kind have no city');
  });

  it('suggests a wider radius when nothing is near, with no leads to view', () => {
    const { onChangeSearch } = view({ phase: 'done', total: 0, unplaced: 0 });
    expect(screen.getByTestId('nearby-result')).toHaveTextContent('No leads within 5 km. Try a wider radius.');
    expect(screen.queryByTestId('nearby-view')).toBeNull();
    expect(screen.queryByTestId('nearby-unplaced')).toBeNull();
    fireEvent.click(screen.getByTestId('nearby-change'));
    expect(onChangeSearch).toHaveBeenCalled();
  });

  it('shows what went wrong and lets the search be changed', () => {
    const { onChangeSearch } = view({ phase: 'error', message: 'Location access is blocked.' });
    expect(screen.getByRole('alert')).toHaveTextContent('Location access is blocked.');
    fireEvent.click(screen.getByTestId('nearby-change'));
    expect(onChangeSearch).toHaveBeenCalled();
  });
});

describe('RadarScan', () => {
  it('hides the dish from assistive tech and announces the label', () => {
    const { container } = render(<RadarScan label="Finding leads within 5 km…" />);
    expect(screen.getByRole('status')).toHaveTextContent('Finding leads within 5 km…');
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });
});

describe('distanceColumn', () => {
  const t = ((key: string, opts?: { vars?: Record<string, unknown> }) =>
    opts?.vars ? `${key}:${JSON.stringify(opts.vars)}` : key) as Parameters<typeof distanceColumn>[0];
  type Row = NearbyRowFields & { id: string };
  const column = distanceColumn<Row>(t);

  it('is a number column on the server-sorted distance_km field', () => {
    expect(column).toMatchObject({ field: 'distance_km', headerName: 'crm.nearby.distance', type: 'number' });
    expect(column.valueGetter?.({ id: 'a', distance_km: 2.34 })).toBe(2.34);
    expect(column.valueGetter?.({ id: 'a' })).toBeNull();
  });

  it('shows the distance and how the lead was placed', () => {
    render(<>{column.cellRenderer?.({ id: 'a', distance_km: 2.34, geo_precision: 'AREA' })}</>);
    expect(screen.getByText('crm.nearby.distanceValue:{"km":"2.3"}')).toBeInTheDocument();
    expect(screen.getByText('crm.nearby.precisionAreaShort')).toBeInTheDocument();
  });

  it('shows a dash and no placement for a row outside a nearby search', () => {
    render(<>{column.cellRenderer?.({ id: 'a', distance_km: null, geo_precision: null })}</>);
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByText(/precision/)).toBeNull();
  });

  it('rounds to one decimal under 10 km and to whole kilometres beyond', () => {
    expect(formatKm(0.04)).toBe('0.0');
    expect(formatKm(9.96)).toBe('10.0');
    expect(formatKm(12.6)).toBe('13');
  });
});
