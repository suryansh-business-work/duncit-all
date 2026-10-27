import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Timeline } from '../../../pages/home/Timeline';
import { mergeMyEvents } from '../../../pages/home/useMyEvents';
import { eventCardFixture, renderWithProviders } from '../../test-utils';

// The device zone is pinned to the events' own zone, so the day headings read
// the same whichever zone the date formatter actually uses.
beforeEach(() => {
  vi.stubEnv('TZ', 'Asia/Kolkata');
});
afterEach(() => {
  vi.unstubAllEnvs();
});

const event = (id: string, start: string) => eventCardFixture({ id, slug: id, title: id, start_at: start, end_at: start, timezone: 'Asia/Kolkata' });

describe('Timeline', () => {
  it('heads a day with its date once, adding Today underneath only when it is today', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-21T04:00:00.000Z'));
    const rows = mergeMyEvents([], [event('Garden party', '2026-11-21T13:30:00.000Z'), event('Brunch', '2026-11-25T05:00:00.000Z')], false);
    renderWithProviders(<Timeline rows={rows} />);
    const [today, later] = within(screen.getByTestId('timeline')).getAllByRole('listitem');
    const todayHeading = within(today).getByRole('heading', { level: 2 });
    expect(todayHeading).toHaveTextContent('21 Nov 2026');
    expect(todayHeading.nextElementSibling).toHaveTextContent('Today');
    const laterHeading = within(later).getByRole('heading', { level: 2 });
    expect(laterHeading).toHaveTextContent('25 Nov 2026');
    expect(laterHeading.nextElementSibling).toBeNull();
    vi.useRealTimers();
  });

  it('groups the events by the day they start in their own zone, in order', () => {
    const rows = mergeMyEvents(
      [event('Supper club', '2026-11-21T15:00:00.000Z')],
      [
        event('Garden party', '2026-11-21T13:30:00.000Z'),
        // 20:00 UTC on the 21st is 01:30 on the 22nd in Delhi: the next day's group.
        event('Late-night jam', '2026-11-21T20:00:00.000Z'),
      ],
      false,
    );
    renderWithProviders(<Timeline rows={rows} />);

    const days = within(screen.getByTestId('timeline')).getAllByRole('listitem');
    expect(days).toHaveLength(2);

    expect(within(days[0]).getByRole('heading', { level: 2 })).toHaveTextContent('21 Nov 2026');
    expect(within(days[0]).getAllByRole('heading', { level: 3 }).map((title) => title.textContent)).toEqual(['Garden party', 'Supper club']);

    expect(within(days[1]).getByRole('heading', { level: 2 })).toHaveTextContent('22 Nov 2026');
    expect(within(days[1]).getAllByTestId('timeline-card')).toHaveLength(1);
    expect(within(days[1]).getByRole('heading', { level: 3, name: 'Late-night jam' })).toBeInTheDocument();
  });

  it('draws an empty list for no rows', () => {
    renderWithProviders(<Timeline rows={[]} />);
    expect(screen.getByTestId('timeline')).toBeEmptyDOMElement();
  });
});
