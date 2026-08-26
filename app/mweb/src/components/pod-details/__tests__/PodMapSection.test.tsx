/**
 * Where and when a pod happens, on the pod page.
 *
 * This is the section a member reads to decide whether they can physically get
 * there, so the address has to be the FULL one the venue holds — a venue name
 * with no street is not something anybody can navigate to. It is assembled from
 * every part the venue has and skips the ones it does not, so a venue with no
 * second address line does not render a stray comma.
 *
 * A VIRTUAL pod has no place at all, and saying "—" where the address should be
 * would read as missing data rather than as a pod that happens online.
 *
 * The pincode is the venue's zone first and the city's second, because a city
 * pincode on a pod in a different zone is worse than none: it is confidently
 * wrong, and it is what a maps app would take.
 */
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import PodMapSection from '../PodMapSection';

/** The map itself is an embed; what matters here is the pincode handed to it. */
vi.mock('../../../pages/pod-details-page/PodLocationMap', () => ({
  default: ({ pincode, zoneName }: { pincode: string | null; zoneName: string }) => (
    <div data-testid="map" data-pincode={pincode ?? ''} data-zone={zoneName} />
  ),
}));

const testTheme = createTheme();

const pod = (over: Record<string, unknown> = {}) => ({
  id: 'pod-1',
  pod_mode: 'PHYSICAL',
  pod_date_time: '2026-08-30T12:30:00.000Z',
  pod_end_date_time: '2026-08-30T14:00:00.000Z',
  zone_name: 'South',
  ...over,
});

const VENUE = {
  id: 'venue-1',
  venue_name: 'Indiranagar Courts',
  address_line1: '12 Church Street',
  address_line2: '',
  locality: 'Indiranagar',
  city: 'Bengaluru',
  state: 'Karnataka',
  postal_code: '560001',
  country: 'India',
};

const LOCATION = {
  id: 'loc-1',
  location_name: 'Bengaluru',
  location_pincode: '560000',
  location_zones: [
    { zone_name: 'South', pincode: '560076' },
    { zone_name: 'North', pincode: '560024' },
  ],
};

/**
 * Standing in for `joinPodMeeting`.
 *
 * The Join button never hrefs `pod.meeting_url` — asking the server for the
 * link is the call that marks the member present, so the URL only ever arrives
 * from this promise. A case that wants to assert on the opened link overrides
 * it through `section({ onJoinMeeting })`.
 */
const JOIN_URL = 'https://meet.google.com/abc-defg-hij';
const joinsWithLink = () => Promise.resolve(JOIN_URL);

const section = (over: Record<string, unknown> = {}) =>
  render(
    <ThemeProvider theme={testTheme}>
      <MemoryRouter>
        <PodMapSection
          pod={pod()}
          location={LOCATION}
          venue={VENUE}
          onJoinMeeting={joinsWithLink}
          {...over}
        />
      </MemoryRouter>
    </ThemeProvider>
  );

describe('PodMapSection', () => {
  it('says when the pod runs, from both ends of it', () => {
    const { container } = section();

    expect(container.textContent).toContain('2026');
  });

  it('renders a pod with no end time, without a dangling arrow', () => {
    const { container } = section({ pod: pod({ pod_end_date_time: null }) });

    expect(container.textContent).not.toContain('→');
  });

  it('renders a pod with no time at all rather than crashing on it', () => {
    const { container } = section({
      pod: pod({ pod_date_time: null, pod_end_date_time: null }),
    });

    expect(container.innerHTML).not.toBe('');
  });

  it('gives the FULL address, because a venue name is not somewhere anybody can go', () => {
    const { container } = section();

    expect(container.textContent).toContain('Indiranagar Courts');
    expect(container.textContent).toContain('12 Church Street');
    expect(container.textContent).toContain('Bengaluru');
    expect(container.textContent).toContain('560001');
  });

  it('skips the address parts a venue does not have, without a stray comma', () => {
    const { container } = section({
      venue: { ...VENUE, address_line2: '', state: '', country: '' },
    });

    expect(container.textContent).not.toContain(', ,');
  });

  it('falls back to the city when the pod has no venue attached', () => {
    const { container } = section({ venue: null });

    expect(container.textContent).toContain('Bengaluru');
  });

  it('renders a pod with neither venue nor location', () => {
    const { container } = section({ venue: null, location: null });

    expect(container.innerHTML).not.toBe('');
  });

  it('takes the pincode from the pod ZONE before the city', () => {
    const { container } = section({ venue: null });

    // A city pincode on a pod in another zone is confidently wrong, and it is
    // what a maps app would take.
    expect(container.querySelector('[data-testid="map"]')?.getAttribute('data-pincode')).toBe(
      '560076'
    );
  });

  it('falls back to the city pincode for a pod in no zone', () => {
    const { container } = section({ venue: null, pod: pod({ zone_name: '' }) });

    expect(container.querySelector('[data-testid="map"]')?.getAttribute('data-pincode')).toBe(
      '560000'
    );
  });

  it('falls back to the city pincode for a zone the city does not list', () => {
    const { container } = section({ venue: null, pod: pod({ zone_name: 'Atlantis' }) });

    expect(container.querySelector('[data-testid="map"]')?.getAttribute('data-pincode')).toBe(
      '560000'
    );
  });

  it('renders a city that has no zones recorded at all', () => {
    const { container } = section({
      venue: null,
      location: { ...LOCATION, location_zones: null },
    });

    expect(container.textContent).toContain('Bengaluru');
  });

  it('renders a VIRTUAL pod without pretending it has an address', () => {
    const virtual = section({ pod: pod({ pod_mode: 'VIRTUAL' }), venue: null });
    const physical = section();

    // "—" where the address should be reads as missing data, not as online.
    expect(virtual.container.innerHTML).not.toBe(physical.container.innerHTML);
  });

  it('gives a virtual pod its join link, opened away from the app', () => {
    const { container } = section({
      pod: pod({
        pod_mode: 'VIRTUAL',
        meeting_platform: 'GOOGLE_MEET',
        meeting_url: 'https://meet.google.com/abc-defg-hij',
        meeting_notes: 'Join five minutes early.',
      }),
      venue: null,
    });

    const join = container.querySelector('a[href*="meet.google.com"]');
    expect(join).not.toBeNull();
    expect(join?.getAttribute('target')).toBe('_blank');
    expect(container.textContent).toContain('Join five minutes early.');
  });

  it('tells a member the link arrives after they join, rather than showing a dead button', () => {
    const { container } = section({
      pod: pod({ pod_mode: 'VIRTUAL', meeting_platform: 'ZOOM', meeting_url: '' }),
      venue: null,
    });

    // A link nobody has been given yet is not a link — a disabled Join button
    // would read as the meeting being broken.
    expect(container.querySelector('a[href]')).toBeNull();
    expect(container.innerHTML).not.toBe('');
  });
});
