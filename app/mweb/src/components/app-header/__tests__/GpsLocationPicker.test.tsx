import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import GpsLocationPicker from '../GpsLocationPicker';

const h = vi.hoisted(() => ({ geo: vi.fn(), error: vi.fn() }));
vi.mock('../useGeoLocation', () => ({ useGeoLocation: h.geo }));
vi.mock('@duncit/logs', () => ({ logs: { mWeb: { error: h.error } } }));

const locations = [
  {
    id: 'l1',
    city: 'Bengaluru',
    location_name: 'Bengaluru',
    location_pincode: '560001',
    location_zones: [{ zone_name: 'Indiranagar', pincode: '560038' }],
  },
];

const geoState = (over: object = {}) => ({
  busy: false,
  error: null,
  geocoded: null,
  request: vi.fn().mockResolvedValue(undefined),
  reset: vi.fn(),
  ...over,
});

const picker = (props: Partial<Parameters<typeof GpsLocationPicker>[0]> = {}) => {
  const onAutoSelect = vi.fn();
  render(<GpsLocationPicker locations={locations} onAutoSelect={onAutoSelect} {...props} />);
  return onAutoSelect;
};

beforeEach(() => {
  vi.clearAllMocks();
  h.geo.mockReturnValue(geoState());
});

describe('GpsLocationPicker', () => {
  it('resets and requests the position on press', () => {
    const state = geoState();
    h.geo.mockReturnValue(state);
    picker();
    fireEvent.click(screen.getByTestId('gps-location-picker-use-location'));
    expect(state.reset).toHaveBeenCalledTimes(1);
    expect(state.request).toHaveBeenCalledTimes(1);
  });

  it('logs a rejected request instead of swallowing it', async () => {
    const failure = new Error('boom');
    h.geo.mockReturnValue(geoState({ request: vi.fn().mockRejectedValue(failure) }));
    picker();
    fireEvent.click(screen.getByTestId('gps-location-picker-use-location'));
    await vi.waitFor(() =>
      expect(h.error).toHaveBeenCalledWith('GpsLocationPicker', 'request', {
        error: failure,
        msg: 'geolocation request failed',
      })
    );
  });

  it('disables the button and shows Locating while busy', () => {
    h.geo.mockReturnValue(geoState({ busy: true }));
    picker();
    expect(screen.getByTestId('gps-location-picker-use-location')).toBeDisabled();
    expect(screen.getByTestId('gps-location-picker-use-location')).toHaveTextContent('Locating');
  });

  it('shows a geolocation error', () => {
    h.geo.mockReturnValue(geoState({ error: 'Location permission was denied' }));
    picker();
    expect(screen.getByTestId('gps-location-picker-error')).toHaveTextContent('Location permission was denied');
  });

  it('says Duncit is not in the detected city when nothing matches, naming the area generically without a city', () => {
    h.geo.mockReturnValue(geoState({ geocoded: { city: 'Atlantis', state: '', country: '', pincode: '' } }));
    const onAutoSelect = picker();
    expect(screen.getByTestId('gps-location-picker-detected')).toHaveTextContent('Detected: Atlantis');
    expect(screen.getByTestId('gps-location-picker-no-coverage')).toHaveTextContent('Atlantis');
    expect(onAutoSelect).not.toHaveBeenCalled();
  });

  it('uses "your area" when the geocoder returned no city', () => {
    h.geo.mockReturnValue(geoState({ geocoded: { city: '', state: '', country: '', pincode: '999999' } }));
    picker();
    expect(screen.queryByTestId('gps-location-picker-detected')).not.toBeInTheDocument();
    expect(screen.getByTestId('gps-location-picker-no-coverage')).toHaveTextContent('your area');
  });

  it('selects a match without live pods, with its zone, once, and tells the user to pick', () => {
    h.geo.mockReturnValue(geoState({ geocoded: { city: 'Bengaluru', state: '', country: '', pincode: '560038' } }));
    const onAutoSelect = picker();
    expect(screen.getByTestId('gps-location-picker-detected')).toHaveTextContent('Bengaluru · 560038');
    expect(screen.getByTestId('gps-location-picker-no-pods')).toHaveTextContent('Bengaluru');
    expect(onAutoSelect).toHaveBeenCalledTimes(1);
    expect(onAutoSelect).toHaveBeenCalledWith('l1', 'Indiranagar');
  });

  it('does not re-apply the same match when the parent re-renders with new handlers', () => {
    h.geo.mockReturnValue(geoState({ geocoded: { city: 'Bengaluru', state: '', country: '', pincode: '560001' } }));
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(<GpsLocationPicker locations={locations} onAutoSelect={first} />);
    rerender(<GpsLocationPicker locations={locations} onAutoSelect={second} />);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });

  it('auto-applies a match with live pods when a handler exists', () => {
    h.geo.mockReturnValue(geoState({ geocoded: { city: 'Bengaluru', state: '', country: '', pincode: '560001' } }));
    const onAutoApply = vi.fn();
    const onAutoSelect = picker({ activeLocationIds: ['l1'], onAutoApply });
    expect(screen.getByTestId('gps-location-picker-success')).toHaveTextContent('Bengaluru');
    expect(onAutoApply).toHaveBeenCalledWith('l1', '');
    expect(onAutoSelect).not.toHaveBeenCalled();
  });

  it('only selects when a live-pod match has no auto-apply handler', () => {
    h.geo.mockReturnValue(geoState({ geocoded: { city: 'Bengaluru', state: '', country: '', pincode: '560001' } }));
    const onAutoSelect = picker({ activeLocationIds: ['l1'] });
    expect(onAutoSelect).toHaveBeenCalledWith('l1', '');
  });
});
