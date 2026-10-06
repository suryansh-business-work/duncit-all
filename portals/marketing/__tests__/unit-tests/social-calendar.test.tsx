import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { GraphQLError } from 'graphql';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../testkit';

// The admin-zone clock: a fixed "now" and a day key read straight off the ISO
// instant, so which day a post lands on is deterministic on any machine.
const clock = vi.hoisted(() => ({
  now: () => new Date('2026-09-15T08:00:00.000Z'),
  dayKey: (value: Date | string) => (typeof value === 'string' ? value : value.toISOString()).slice(0, 10),
  formatTime: (value: string) => `at ${value.slice(11, 16)}`,
}));
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => clock,
}));

import { SOCIAL_CALENDAR, type SocialCalendarItem } from '../../src/pages/social-accounts-page/publish.queries';
import {
  dayNumber,
  dayTitle,
  gridRange,
  mondayFirstWeekdays,
  monthTitle,
  monthWeeks,
  shiftMonth,
  suggestedTime,
  weekdayNames,
} from '../../src/pages/social-accounts-page/publish/calendar-grid';
import CalendarAgenda from '../../src/pages/social-accounts-page/publish/CalendarAgenda';
import CalendarDayCell from '../../src/pages/social-accounts-page/publish/CalendarDayCell';
import CalendarItemButton from '../../src/pages/social-accounts-page/publish/CalendarItemButton';
import CalendarView from '../../src/pages/social-accounts-page/publish/CalendarView';

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

const makeItem = (over: Partial<SocialCalendarItem> = {}): SocialCalendarItem => ({
  id: 'c1',
  kind: 'PLANNED',
  at: '2026-09-17T10:00:00.000Z',
  status: 'SCHEDULED',
  text: 'Run club recap',
  media_url: null,
  permalink: null,
  platforms: ['LINKEDIN'],
  account_names: ['Duncit Pages'],
  engagement: null,
  ...over,
});

const calendarMock = (month: string, items: SocialCalendarItem[]): MockedResponse => ({
  request: { query: SOCIAL_CALENDAR, variables: gridRange(monthWeeks(month)) },
  result: { data: { socialCalendar: items.map((item) => ({ __typename: 'SocialCalendarItem', ...item })) } },
});

describe('calendar-grid', () => {
  it('draws a month as whole Monday-first weeks padded with the neighbouring months', () => {
    const weeks = monthWeeks('2026-09');
    expect(weeks).toHaveLength(5);
    expect(weeks[0]).toEqual(['2026-08-31', '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06']);
    expect(weeks.at(-1)).toEqual(['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
  });

  it('needs a sixth row when a month starts late in the week', () => {
    const weeks = monthWeeks('2026-08');
    expect(weeks).toHaveLength(6);
    expect(weeks[0]?.[0]).toBe('2026-07-27');
    expect(weeks[5]?.[6]).toBe('2026-09-06');
  });

  it('moves between months across a year boundary and names them', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(monthTitle('2026-09')).toBe('September 2026');
  });

  it('names weekdays, day numbers and days', () => {
    expect(weekdayNames(['2026-08-31', '2026-09-01'])).toEqual(['Mon', 'Tue']);
    expect(mondayFirstWeekdays()).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    expect(dayNumber('2026-09-07')).toBe(7);
    expect(dayTitle('2026-09-17')).toBe('Thursday 17 September');
  });

  it('covers the grid from its first day up to the day after its last', () => {
    expect(gridRange(monthWeeks('2026-09'))).toEqual({
      from: new Date(2026, 7, 31).toISOString(),
      to: new Date(2026, 9, 5).toISOString(),
    });
  });

  it('falls back to a one-day range on today for an empty grid', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 15, 12));
    expect(gridRange([])).toEqual({ from: new Date(2026, 8, 15).toISOString(), to: new Date(2026, 8, 16).toISOString() });
  });

  it('suggests an hour from now for today and 10:00 for a later day', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-15T08:00:00.000Z'));
    expect(suggestedTime('2026-09-15', '2026-09-15')).toBe('2026-09-15T09:00:00.000Z');
    expect(suggestedTime('2026-09-20', '2026-09-15')).toBe(new Date(2026, 8, 20, 10).toISOString());
  });
});

describe('CalendarItemButton', () => {
  it('names the time, status, accounts and text, shows each network, and opens on press', () => {
    const item = makeItem({ platforms: ['LINKEDIN', 'X'], account_names: ['Duncit Pages', 'Duncit X'] });
    const onOpen = vi.fn();
    renderWithProviders(<CalendarItemButton item={item} onOpen={onOpen} />);
    const button = screen.getByTestId('social-calendar-item-c1');
    expect(button).toHaveAccessibleName('at 10:00 · Scheduled · Duncit Pages, Duncit X: Run club recap');
    expect(within(button).getByText('at 10:00')).toBeInTheDocument();
    expect(within(button).getByText('Run club recap')).toBeInTheDocument();
    expect(button.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(2);
    fireEvent.click(button);
    expect(onOpen).toHaveBeenCalledWith(item);
  });

  it('labels a failed post as failed', () => {
    renderWithProviders(<CalendarItemButton item={makeItem({ status: 'FAILED' })} onOpen={vi.fn()} />);
    expect(screen.getByTestId('social-calendar-item-c1')).toHaveAccessibleName(/· Failed ·/);
  });
});

describe('CalendarDayCell', () => {
  const four = ['a', 'b', 'c', 'd'].map((id) => makeItem({ id, text: `Post ${id}` }));

  it('makes a coming day a button that starts a post on it', () => {
    const onAdd = vi.fn();
    renderWithProviders(
      <CalendarDayCell day="2026-09-17" today="2026-09-15" inMonth items={[]} onAdd={onAdd} onOpen={vi.fn()} />,
    );
    expect(screen.getByRole('cell', { name: 'Thursday 17 September' })).toBeInTheDocument();
    const add = screen.getByTestId('social-calendar-add-2026-09-17');
    expect(add).toHaveAccessibleName('Add a post on Thursday 17 September');
    expect(add).toHaveTextContent('17');
    fireEvent.click(add);
    expect(onAdd).toHaveBeenCalledWith('2026-09-17');
  });

  it('lets today start a post too', () => {
    renderWithProviders(
      <CalendarDayCell day="2026-09-15" today="2026-09-15" inMonth items={[]} onAdd={vi.fn()} onOpen={vi.fn()} />,
    );
    expect(screen.getByTestId('social-calendar-add-2026-09-15')).toHaveTextContent('15');
  });

  it('shows a past day as plain text with no add button', () => {
    renderWithProviders(
      <CalendarDayCell day="2026-09-03" today="2026-09-15" inMonth={false} items={[]} onAdd={vi.fn()} onOpen={vi.fn()} />,
    );
    const cell = screen.getByRole('cell', { name: 'Thursday 3 September' });
    expect(within(cell).getByText('3')).toBeInTheDocument();
    expect(within(cell).queryByRole('button')).not.toBeInTheDocument();
  });

  it('folds entries past the third behind "+N more" and unfolds them on press', () => {
    const onOpen = vi.fn();
    renderWithProviders(
      <CalendarDayCell day="2026-09-03" today="2026-09-15" inMonth items={four} onAdd={vi.fn()} onOpen={onOpen} />,
    );
    expect(screen.getByTestId('social-calendar-item-c')).toBeInTheDocument();
    expect(screen.queryByTestId('social-calendar-item-d')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '+1 more' }));
    expect(screen.getByTestId('social-calendar-item-d')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /more/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('social-calendar-item-d'));
    expect(onOpen).toHaveBeenCalledWith(four[3]);
  });

  it('shows up to three entries without a fold', () => {
    renderWithProviders(
      <CalendarDayCell day="2026-09-03" today="2026-09-15" inMonth items={four.slice(0, 3)} onAdd={vi.fn()} onOpen={vi.fn()} />,
    );
    expect(screen.getAllByTestId(/^social-calendar-item-/)).toHaveLength(3);
    expect(screen.queryByRole('button', { name: /more/ })).not.toBeInTheDocument();
  });
});

describe('CalendarAgenda', () => {
  it('lists only the days with posts, each under its title', () => {
    const first = makeItem({ id: 'x1', at: '2026-09-03T09:00:00.000Z' });
    const second = makeItem({ id: 'x2', at: '2026-09-20T09:00:00.000Z', kind: 'PUBLISHED', status: 'PUBLISHED' });
    const byDay = new Map([
      ['2026-09-03', [first]],
      ['2026-09-10', []],
      ['2026-09-20', [second]],
    ]);
    const onOpen = vi.fn();
    renderWithProviders(
      <CalendarAgenda days={['2026-09-03', '2026-09-04', '2026-09-10', '2026-09-20']} byDay={byDay} onOpen={onOpen} />,
    );
    const agenda = screen.getByTestId('social-calendar-agenda');
    expect(within(agenda).getAllByRole('heading').map((h) => h.textContent)).toEqual([
      'Thursday 3 September',
      'Sunday 20 September',
    ]);
    fireEvent.click(within(agenda).getByTestId('social-calendar-item-x2'));
    expect(onOpen).toHaveBeenCalledWith(second);
  });

  it('says nothing is planned when no day has a post', () => {
    renderWithProviders(<CalendarAgenda days={['2026-09-03']} byDay={new Map()} onOpen={vi.fn()} />);
    expect(screen.getByText('Nothing planned or posted this month yet.')).toBeInTheDocument();
    expect(screen.queryByTestId('social-calendar-agenda')).not.toBeInTheDocument();
  });
});

describe('CalendarView', () => {
  const later = makeItem({ id: 'late', at: '2026-09-03T18:00:00.000Z', text: 'Evening post' });
  const earlier = makeItem({ id: 'early', at: '2026-09-03T07:00:00.000Z', text: 'Morning post', kind: 'PUBLISHED', status: 'PUBLISHED' });
  const outside = makeItem({ id: 'aug', at: '2026-08-31T07:00:00.000Z', text: 'August post' });

  /** Report a phone-width screen to MUI's media query (the theme's `down('md')`). */
  const asPhone = () =>
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          matches: query.includes('max-width'),
          media: query,
          onchange: null,
          addListener: () => undefined,
          removeListener: () => undefined,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
          dispatchEvent: () => false,
        }) as unknown as MediaQueryList,
    );

  it('draws the current month as a table, each day holding its posts in time order', async () => {
    const onOpen = vi.fn();
    const onAdd = vi.fn();
    renderWithProviders(<CalendarView onAdd={onAdd} onOpen={onOpen} />, {
      mocks: [calendarMock('2026-09', [later, earlier, outside])],
    });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    const table = screen.getByRole('table', { name: 'September 2026' });
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun',
    ]);
    expect(within(table).getAllByRole('cell')).toHaveLength(35);

    const day = within(table).getByRole('cell', { name: 'Thursday 3 September' });
    await within(day).findByTestId('social-calendar-item-early');
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(within(day).getAllByTestId(/^social-calendar-item-/).map((b) => b.dataset.testid)).toEqual([
      'social-calendar-item-early',
      'social-calendar-item-late',
    ]);
    // The neighbouring month's padding day still carries its post.
    expect(within(table).getByRole('cell', { name: 'Monday 31 August' })).toHaveTextContent('August post');

    fireEvent.click(within(day).getByTestId('social-calendar-item-late'));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'late', text: 'Evening post' }));

    fireEvent.click(screen.getByTestId('social-calendar-add-2026-09-20'));
    expect(onAdd).toHaveBeenCalledWith('2026-09-20', '2026-09-15');
    expect(screen.queryByTestId('social-calendar-add-2026-09-14')).not.toBeInTheDocument();
  });

  it('steps to the next and previous month and back to today', async () => {
    renderWithProviders(<CalendarView onAdd={vi.fn()} onOpen={vi.fn()} />, {
      mocks: [
        calendarMock('2026-09', []),
        calendarMock('2026-10', [makeItem({ id: 'oct', at: '2026-10-08T09:00:00.000Z' })]),
        // cache-and-network: passing back through a month asks the network again.
        calendarMock('2026-09', []),
        calendarMock('2026-08', []),
        calendarMock('2026-09', [makeItem({ id: 'back', at: '2026-09-21T09:00:00.000Z' })]),
      ],
    });
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent('September 2026');

    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(heading).toHaveTextContent('October 2026');
    expect(await screen.findByTestId('social-calendar-item-oct')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(heading).toHaveTextContent('August 2026');
    expect(screen.getByRole('table', { name: 'August 2026' })).toBeInTheDocument();
    expect(screen.getAllByRole('cell')).toHaveLength(42);

    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(heading).toHaveTextContent('September 2026');
    expect(await screen.findByTestId('social-calendar-item-back')).toBeInTheDocument();
  });

  it('shows why the calendar could not load', async () => {
    renderWithProviders(<CalendarView onAdd={vi.fn()} onOpen={vi.fn()} />, {
      mocks: [
        {
          request: { query: SOCIAL_CALENDAR, variables: gridRange(monthWeeks('2026-09')) },
          result: { errors: [new GraphQLError('Calendar is down')] },
        },
      ],
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Calendar is down');
    expect(screen.queryByTestId('social-calendar-item-early')).not.toBeInTheDocument();
  });

  it('reads as an agenda of this month’s busy days on a phone', async () => {
    asPhone();
    renderWithProviders(<CalendarView onAdd={vi.fn()} onOpen={vi.fn()} />, {
      mocks: [calendarMock('2026-09', [later, earlier, outside])],
    });
    const agenda = await screen.findByTestId('social-calendar-agenda');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(within(agenda).getAllByRole('heading').map((h) => h.textContent)).toEqual(['Thursday 3 September']);
    expect(within(agenda).queryByText('August post')).not.toBeInTheDocument();
  });
});
