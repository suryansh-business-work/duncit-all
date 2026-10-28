import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventRow } from '../../../components/events/EventRow';
import { eventCardFixture, renderWithProviders } from '../../test-utils';

// Device pinned to the event's zone: the time reads the same whichever zone the formatter uses.
beforeEach(() => {
  vi.stubEnv('TZ', 'Asia/Kolkata');
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe('EventRow', () => {
  it('links to the event with its date and time, title and place', () => {
    renderWithProviders(<EventRow event={eventCardFixture()} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/e/garden-party');
    expect(link).toHaveTextContent('21 Nov 2026, 07:00 PM');
    expect(link).toHaveTextContent('Garden Party');
    expect(screen.getByText('Lodhi Garden · Delhi')).toBeInTheDocument();
  });

  it('says Online for a virtual event', () => {
    renderWithProviders(<EventRow event={eventCardFixture({ location_type: 'VIRTUAL' })} />);
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('shows the venue alone when the city is unknown', () => {
    renderWithProviders(<EventRow event={eventCardFixture({ city_name: null })} />);
    expect(screen.getByText('Lodhi Garden')).toBeInTheDocument();
  });

  it('drops the place line when there is no venue or city', () => {
    renderWithProviders(<EventRow event={eventCardFixture({ venue_name: null, city_name: null })} />);
    expect(screen.getByRole('link').textContent).toBe('21 Nov 2026, 07:00 PMGarden Party');
  });

  it('draws the cover as decoration', () => {
    renderWithProviders(<EventRow event={eventCardFixture({ cover_url: 'https://img.example/cover.jpg' })} />);
    const cover = screen.getByRole('link').querySelector('img');
    expect(cover).toHaveAttribute('src', 'https://img.example/cover.jpg');
    expect(cover).toHaveAttribute('alt', '');
  });
});
