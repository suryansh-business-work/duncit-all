import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

import ClubMeetupVenuesSection from '../ClubMeetupVenuesSection';

vi.mock('../../../components/VenueMapPreview', () => ({
  default: (p: { title: string; parts: string[]; lat?: number; lng?: number }) => (
    <div data-testid="map" data-title={p.title} data-lat={String(p.lat)} data-parts={p.parts.filter(Boolean).join('|')} />
  ),
}));

const venues = [
  { id: 'v1', venue_name: 'Cafe One', locality: 'Indiranagar', city: 'Bengaluru', state: 'KA', lat: 12.97, lng: 77.64 },
  { id: 'v2', venue_name: 'Park Two', locality: '', city: 'Mysuru', lat: undefined, lng: undefined },
];

const view = (list = venues) =>
  render(
    <MemoryRouter>
      <ClubMeetupVenuesSection venues={list} />
    </MemoryRouter>
  );

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ClubMeetupVenuesSection', () => {
  it('renders nothing without venues', () => {
    view([]);
    expect(screen.queryByTestId('club-venues')).not.toBeInTheDocument();
  });

  it('selects the first venue and switches the address and map to a clicked card', () => {
    view();
    expect(screen.getByTestId('club-venue-address')).toHaveTextContent('Cafe One, Indiranagar, Bengaluru, KA');
    expect(screen.getByTestId('map')).toHaveAttribute('data-title', 'Cafe One');
    expect(screen.getByTestId('club-venue-open-selected')).toHaveAttribute('href', expect.stringContaining('v1'));

    fireEvent.click(screen.getByText('Park Two'));
    expect(screen.getByTestId('club-venue-address')).toHaveTextContent('Park Two, Mysuru');
    expect(screen.getByTestId('map')).toHaveAttribute('data-title', 'Park Two');
    expect(screen.getByTestId('club-venue-details-v2')).toHaveAttribute('href', expect.stringContaining('v2'));
  });

  it('falls back to the first venue when the selected one disappears from the list', () => {
    const { rerender } = view();
    fireEvent.click(screen.getByText('Park Two'));
    rerender(
      <MemoryRouter>
        <ClubMeetupVenuesSection venues={[venues[0]]} />
      </MemoryRouter>
    );
    expect(screen.getByTestId('club-venue-address')).toHaveTextContent('Cafe One');
  });

  it('shows distances from the visitor position and hides the locate button', () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (ok: (p: unknown) => void) => ok({ coords: { latitude: 12.97, longitude: 77.64 } }),
      },
    });
    view();
    fireEvent.click(screen.getByTestId('club-venues-locate'));
    expect(screen.queryByTestId('club-venues-locate')).not.toBeInTheDocument();
    expect(screen.getByText('0 m away')).toBeInTheDocument();
    // v2 has no coordinates, so it gets no distance chip: exactly one chip overall.
    expect(screen.getAllByText(/ away$/)).toHaveLength(1);
  });

  it('stays on the button, re-enabled, when the position is refused', () => {
    vi.stubGlobal('navigator', {
      geolocation: { getCurrentPosition: (_ok: unknown, fail: () => void) => fail() },
    });
    view();
    fireEvent.click(screen.getByTestId('club-venues-locate'));
    expect(screen.getByTestId('club-venues-locate')).toBeEnabled();
    expect(screen.getByTestId('club-venues-locate')).toHaveTextContent('Show distance');
  });

  it('does nothing when the browser has no geolocation', () => {
    vi.stubGlobal('navigator', {});
    view();
    fireEvent.click(screen.getByTestId('club-venues-locate'));
    expect(screen.getByTestId('club-venues-locate')).toHaveTextContent('Show distance');
  });

  it('shows Locating while the position is pending', () => {
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: vi.fn() } });
    view();
    fireEvent.click(screen.getByTestId('club-venues-locate'));
    expect(screen.getByTestId('club-venues-locate')).toBeDisabled();
    expect(screen.getByTestId('club-venues-locate')).toHaveTextContent('Locating');
  });
});
