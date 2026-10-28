import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EventMap } from '../../../components/EventMap';
import { eventFixture, renderWithProviders } from '../../test-utils';

const KEY = 'browser-key';
const pinned = { lat: 28.5931, lng: 77.2197, place_id: 'ChIJ-lodhi' };

describe('EventMap', () => {
  it("still draws the place without a Maps key, through Google's keyless embed", () => {
    renderWithProviders(<EventMap event={eventFixture(pinned)} />, { settings: { maps_api_key: '' } });
    expect(screen.getByTitle('Map of Lodhi Garden')).toHaveAttribute('src', `https://maps.google.com/maps?q=${encodeURIComponent('28.5931,77.2197')}&z=15&output=embed`);
  });

  it('maps a pasted Google Maps link by its coordinates when there is no pin', () => {
    const event = eventFixture({ ...pinned, lat: null, lng: null, map_url: 'https://www.google.com/maps/place/Lodhi+Garden/@28.5931,77.2197,15z' });
    renderWithProviders(<EventMap event={event} />, { settings: { maps_api_key: '' } });
    expect(screen.getByTitle('Map of Lodhi Garden')).toHaveAttribute('src', `https://maps.google.com/maps?q=${encodeURIComponent('28.5931,77.2197')}&z=15&output=embed`);
  });

  it('draws nothing when the place has no pin, link, venue or address', () => {
    renderWithProviders(<EventMap event={eventFixture({ lat: null, lng: null, place_id: null, map_url: null, venue_name: null, address: null })} />, { settings: { maps_api_key: KEY } });
    expect(screen.queryByTestId('event-map')).not.toBeInTheDocument();
  });

  it('draws nothing for an online event, even with coordinates', () => {
    renderWithProviders(<EventMap event={eventFixture({ ...pinned, location_type: 'VIRTUAL' })} />, { settings: { maps_api_key: KEY } });
    expect(screen.queryByTestId('event-map')).not.toBeInTheDocument();
  });

  it.each([
    ['latitude', { lat: null, lng: 77.2197 }],
    ['longitude', { lat: 28.5931, lng: null }],
  ])('searches the typed venue and address when the place has no %s (typed by hand, not picked)', (_label, point) => {
    renderWithProviders(<EventMap event={eventFixture({ ...pinned, ...point, map_url: null })} />, { settings: { maps_api_key: KEY } });
    expect(screen.getByTitle('Map of Lodhi Garden')).toHaveAttribute('src', `https://www.google.com/maps/embed/v1/place?key=${KEY}&q=${encodeURIComponent('Lodhi Garden, Lodhi Road, New Delhi')}`);
  });

  it('embeds the picked place by its id, titled with the venue for screen readers', () => {
    renderWithProviders(<EventMap event={eventFixture(pinned)} />, { settings: { maps_api_key: KEY } });

    const frame = screen.getByTitle('Map of Lodhi Garden');
    expect(frame.tagName).toBe('IFRAME');
    expect(frame).toHaveAttribute('src', `https://www.google.com/maps/embed/v1/place?key=${KEY}&q=place_id:ChIJ-lodhi`);
    expect(frame).toHaveAttribute('loading', 'lazy');
    expect(frame).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
  });

  it('centres on the coordinates when there is no place id, and names the address when there is no venue', () => {
    renderWithProviders(<EventMap event={eventFixture({ ...pinned, place_id: null, venue_name: null })} />, { settings: { maps_api_key: KEY } });

    const frame = screen.getByTitle('Map of Lodhi Road, New Delhi');
    expect(frame).toHaveAttribute('src', `https://www.google.com/maps/embed/v1/view?key=${KEY}&center=28.5931,77.2197&zoom=15`);
  });
});
