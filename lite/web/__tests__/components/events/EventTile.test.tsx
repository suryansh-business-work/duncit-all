import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventTile } from '../../../components/events/EventTile';
import { eventCardFixture, renderWithProviders } from '../../test-utils';

// Device pinned to the event's zone: the time reads the same whichever zone the formatter uses.
beforeEach(() => {
  vi.stubEnv('TZ', 'Asia/Kolkata');
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('EventTile', () => {
  it('links to the event with its title and when it starts', () => {
    renderWithProviders(<EventTile event={eventCardFixture({ cover_url: 'https://img.example/tile.jpg' })} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/e/garden-party');
    expect(link).toHaveTextContent('Garden Party');
    expect(screen.getByText('21 Nov 2026, 07:00 PM')).toBeInTheDocument();
    expect(link.querySelector('img')).toHaveAttribute('src', 'https://img.example/tile.jpg');
  });

  it('says Today for an event starting today', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-21T04:00:00.000Z'));
    renderWithProviders(<EventTile event={eventCardFixture()} />);
    expect(screen.getByText('Today, 07:00 PM')).toBeInTheDocument();
  });

  it('stands the bundled placeholder in for a missing cover', () => {
    renderWithProviders(<EventTile event={eventCardFixture({ cover_url: null })} />);
    const cover = screen.getByRole('link').querySelector('img');
    expect(cover?.getAttribute('src')).toBeTruthy();
    expect(cover).toHaveAttribute('alt', '');
  });
});
