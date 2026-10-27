import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import LocationDialog from '../LocationDialog';
import type { LocationLike } from '../../../utils/location-tree';

vi.mock('../GpsLocationPicker', () => ({
  default: (p: { onAutoSelect: (id: string, zone: string) => void; onAutoApply?: unknown; activeLocationIds?: string[] }) => (
    <div data-testid="gps" data-auto-apply={String(Boolean(p.onAutoApply))} data-active={(p.activeLocationIds ?? []).join(',')}>
      <button data-testid="gps-pick-pune" onClick={() => p.onAutoSelect('pune', 'Kothrud')} />
      <button data-testid="gps-pick-ghost" onClick={() => p.onAutoSelect('ghost', 'Nowhere')} />
      <button data-testid="gps-pick-other" onClick={() => p.onAutoSelect('other', '')} />
    </div>
  ),
}));
vi.mock('../LocationMapPreview', () => ({
  default: (p: Record<string, unknown>) => <div data-testid="map" data-city={String(p.city)} data-zone={String(p.zoneName)} data-pin={String(p.pincode)} data-country={String(p.country)} />,
}));

const LOCS: LocationLike[] = [
  { id: 'blr', location_name: 'Bengaluru', city: 'Bengaluru', state: 'Karnataka', country: 'India', country_code: 'IN', location_pincode: '560001', location_zones: [{ zone_name: 'Indiranagar' }, { zone_name: 'Koramangala' }] },
  { id: 'mys', location_name: 'Mysuru', state: 'Karnataka', country: 'India', country_code: 'IN' },
  { id: 'pune', location_name: 'Pune', state: 'Maharashtra', country: 'India', country_code: 'IN', location_zones: [{ zone_name: 'Kothrud' }] },
  { id: 'other', location_name: 'Somewhere' },
  { id: 'kat', location_name: 'Kathmandu', state: 'Bagmati', country: 'Nepal', country_code: 'NP' },
];

const dialog = (over: Partial<Parameters<typeof LocationDialog>[0]> = {}) => {
  const props = {
    open: true,
    onClose: vi.fn(),
    locations: LOCS,
    draftLocationId: 'blr',
    setDraftLocationId: vi.fn(),
    draftZone: '',
    setDraftZone: vi.fn(),
    onApply: vi.fn(),
    ...over,
  };
  const utils = render(<LocationDialog {...props} />);
  return { ...props, ...utils };
};

describe('LocationDialog', () => {
  it('starts on the draft city, listing the cities of its state and its areas', () => {
    dialog();
    expect(screen.getByTestId('country-state-picker-country-India')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('country-state-picker-state-Karnataka')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('location-blr-select')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('location-mys-select')).toBeInTheDocument();
    expect(screen.queryByTestId('location-pune-select')).not.toBeInTheDocument();
    expect(screen.getByTestId('map')).toHaveAttribute('data-city', 'Bengaluru');
    expect(screen.getByTestId('map')).toHaveAttribute('data-pin', '560001');
  });

  it('labels Apply with the area count, then the chosen area', () => {
    const { rerender, ...props } = dialog();
    expect(screen.getByTestId('location-dialog-apply')).toHaveTextContent('Apply · 2 areas');
    rerender(<LocationDialog {...props} draftZone="Indiranagar" />);
    expect(screen.getByTestId('location-dialog-apply')).toHaveTextContent('Apply · Indiranagar');
  });

  it('labels plain Apply for a city with no areas and disables it without a draft city', () => {
    dialog({ draftLocationId: 'mys' });
    expect(screen.getByTestId('location-dialog-apply')).toHaveTextContent(/^Apply$/);
    expect(screen.getByTestId('map')).toHaveAttribute('data-city', 'Mysuru');
  });

  it('disables Apply with no draft city and defaults to the first country and state', () => {
    dialog({ draftLocationId: '' });
    expect(screen.getByTestId('location-dialog-apply')).toBeDisabled();
    expect(screen.getByTestId('country-state-picker-country-India')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('map')).toHaveAttribute('data-city', 'undefined');
  });

  it('applies and cancels', () => {
    const props = dialog();
    fireEvent.click(screen.getByTestId('location-dialog-apply'));
    expect(props.onApply).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('location-dialog-cancel'));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('picking a city drafts it and clears the area', () => {
    const props = dialog();
    fireEvent.click(screen.getByTestId('location-mys-select'));
    expect(props.setDraftLocationId).toHaveBeenCalledWith('mys');
    expect(props.setDraftZone).toHaveBeenCalledWith('');
  });

  it('changing state drafts that state\'s first city and clears the area', () => {
    const props = dialog();
    fireEvent.click(screen.getByTestId('country-state-picker-state-Maharashtra'));
    expect(props.setDraftLocationId).toHaveBeenCalledWith('pune');
    expect(props.setDraftZone).toHaveBeenCalledWith('');
    expect(screen.getByTestId('location-pune-select')).toBeInTheDocument();
    expect(screen.queryByTestId('location-blr-select')).not.toBeInTheDocument();
  });

  it('changing country drafts the first city of its first state', () => {
    const props = dialog();
    fireEvent.click(screen.getByTestId('country-state-picker-country-Nepal'));
    expect(props.setDraftLocationId).toHaveBeenCalledWith('kat');
    expect(screen.getByTestId('country-state-picker-state-Bagmati')).toHaveAttribute('aria-pressed', 'true');
  });

  it('an auto-selected city moves the drilldown to its country and state and drafts it with its zone', () => {
    const props = dialog();
    fireEvent.click(screen.getByTestId('gps-pick-pune'));
    expect(props.setDraftLocationId).toHaveBeenCalledWith('pune');
    expect(props.setDraftZone).toHaveBeenCalledWith('Kothrud');
    expect(screen.getByTestId('country-state-picker-state-Maharashtra')).toHaveAttribute('aria-pressed', 'true');
  });

  it('falls back to the first country when an auto-selected city has no country or state', () => {
    const props = dialog();
    fireEvent.click(screen.getByTestId('country-state-picker-country-Nepal'));
    fireEvent.click(screen.getByTestId('gps-pick-other'));
    expect(props.setDraftLocationId).toHaveBeenLastCalledWith('other');
    expect(screen.getByTestId('country-state-picker-country-India')).toHaveAttribute('aria-pressed', 'true');
  });

  it('still drafts an auto-selected city that is not in the list, leaving the drilldown alone', () => {
    const props = dialog();
    fireEvent.click(screen.getByTestId('gps-pick-ghost'));
    expect(props.setDraftLocationId).toHaveBeenCalledWith('ghost');
    expect(props.setDraftZone).toHaveBeenCalledWith('Nowhere');
    expect(screen.getByTestId('country-state-picker-state-Karnataka')).toHaveAttribute('aria-pressed', 'true');
  });

  it('passes live-pod ids and the auto-apply handler through to the GPS picker', () => {
    dialog({ activeLocationIds: ['blr', 'pune'], onAutoApply: vi.fn() });
    expect(screen.getByTestId('gps')).toHaveAttribute('data-auto-apply', 'true');
    expect(screen.getByTestId('gps')).toHaveAttribute('data-active', 'blr,pune');
  });

  it('re-syncs the drilldown when the draft city changes while open', () => {
    const { rerender, ...props } = dialog();
    rerender(<LocationDialog {...props} draftLocationId="kat" />);
    expect(screen.getByTestId('country-state-picker-country-Nepal')).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows nothing while closed', () => {
    dialog({ open: false });
    expect(screen.queryByTestId('location-dialog-apply')).not.toBeInTheDocument();
  });

  it('copes with no locations at all', () => {
    dialog({ locations: [], draftLocationId: '' });
    expect(screen.queryByTestId('country-state-picker')).not.toBeInTheDocument();
    expect(screen.getByTestId('location-city-grid-empty')).toBeInTheDocument();
  });
});
