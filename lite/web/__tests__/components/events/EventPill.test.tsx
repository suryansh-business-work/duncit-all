import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LiteEventCard } from '../../../../shared/graphql/documents';
import { EventPill } from '../../../components/events/EventPill';
import { eventCardFixture, renderWithProviders } from '../../test-utils';

// Device pinned to the event's zone: the date reads the same whichever zone the formatter uses.
beforeEach(() => {
  vi.stubEnv('TZ', 'Asia/Kolkata');
});
afterEach(() => {
  vi.unstubAllEnvs();
});

const pill = (over: Partial<LiteEventCard> = {}) => renderWithProviders(<EventPill event={eventCardFixture(over)} />);

describe('EventPill', () => {
  it('links to the event with its title, date and city', () => {
    pill();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/e/garden-party');
    expect(screen.getByText('Garden Party')).toBeInTheDocument();
    expect(screen.getByText('21 Nov 2026 · Delhi')).toBeInTheDocument();
  });

  it('says Online for a virtual event', () => {
    pill({ location_type: 'VIRTUAL' });
    expect(screen.getByText('21 Nov 2026 · Online')).toBeInTheDocument();
  });

  it('falls back to the venue when the city is unknown', () => {
    pill({ city_name: null });
    expect(screen.getByText('21 Nov 2026 · Lodhi Garden')).toBeInTheDocument();
  });

  it('shows just the date when there is no place at all', () => {
    pill({ city_name: null, venue_name: null });
    expect(screen.getByText('21 Nov 2026')).toBeInTheDocument();
  });
});
