import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LiteEventCard } from '../../../../shared/graphql/documents';
import { TimelineCard } from '../../../pages/home/TimelineCard';
import { eventCardFixture, renderWithProviders, statsFixture } from '../../test-utils';

// Pinned to the event's own zone so the time reads 07:00 PM either way.
beforeEach(() => {
  vi.stubEnv('TZ', 'Asia/Kolkata');
});
afterEach(() => {
  vi.unstubAllEnvs();
});

const card = (role: 'HOSTING' | 'ATTENDING', over: Partial<LiteEventCard> = {}) =>
  renderWithProviders(<TimelineCard item={{ event: eventCardFixture(over), role }} />);

describe('TimelineCard', () => {
  it('shows when, what, where and how many are going, linking to the event', () => {
    card('ATTENDING', { stats: statsFixture({ going: 3 }) });
    expect(screen.getByText('07:00 PM')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Garden Party' })).toBeInTheDocument();
    expect(screen.getByText('Lodhi Garden · Delhi')).toBeInTheDocument();
    expect(screen.getByText('3 guests')).toBeInTheDocument();
    expect(screen.getAllByRole('link')[0]).toHaveAttribute('href', '/e/garden-party');
  });

  it('marks an attended event Going and offers no Manage', () => {
    card('ATTENDING');
    expect(screen.getByText('Going')).toBeInTheDocument();
    expect(screen.queryByTestId('timeline-manage')).not.toBeInTheDocument();
  });

  it('gives a host Manage event, leading to the manage page, without a Going chip', () => {
    card('HOSTING', { stats: statsFixture({ going: 1 }) });
    expect(screen.getByRole('link', { name: 'Manage event' })).toHaveAttribute('href', '/e/garden-party/manage');
    expect(screen.queryByText('Going')).not.toBeInTheDocument();
    expect(screen.getByText('1 guest')).toBeInTheDocument();
  });

  it('says Online for a virtual event', () => {
    card('ATTENDING', { location_type: 'VIRTUAL', venue_name: null, city_name: null });
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('leaves the place line out when an in-person event names no venue or city', () => {
    card('ATTENDING', { venue_name: null, city_name: null });
    expect(screen.queryByText('Lodhi Garden · Delhi')).not.toBeInTheDocument();
    expect(screen.queryByText('Online')).not.toBeInTheDocument();
  });

  it('flags a draft or cancelled event, but not a published one', () => {
    const { unmount } = card('HOSTING', { status: 'DRAFT' });
    expect(screen.getByTestId('event-status-chip')).toHaveTextContent('Draft');
    unmount();

    card('HOSTING', { status: 'PUBLISHED' });
    expect(screen.queryByTestId('event-status-chip')).not.toBeInTheDocument();
  });
});
