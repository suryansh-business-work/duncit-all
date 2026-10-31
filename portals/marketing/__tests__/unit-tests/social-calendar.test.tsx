import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, within } from '@testing-library/react';
import { GraphQLError } from 'graphql';
import { renderWithProviders } from '../testkit';
import { makeSocialCalendarItem, socialCalendarMock } from '../mocks';

// The admin-zone clock: a fixed "now", a day key read straight off the ISO
// instant and a day rendered as dd/MM/yyyy, so which day a post lands on and
// how a week or day is titled is deterministic on any machine.
const clock = vi.hoisted(() => ({
  now: () => new Date('2026-09-15T08:00:00.000Z'),
  dayKey: (value: Date | string) => (typeof value === 'string' ? value : value.toISOString()).slice(0, 10),
  formatTime: (value: string) => `at ${value.slice(11, 16)}`,
  formatDay: (day: string) => day.split('-').reverse().join('/'),
}));
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => clock,
}));

import { SOCIAL_CALENDAR } from '../../src/pages/social-accounts-page/publish.queries';
import {
  dayNumber,
  dayRange,
  dayTitle,
  gridRange,
  mondayFirstWeekdays,
  monthTitle,
  monthWeeks,
  shift,
  shiftMonth,
  suggestedTime,
  unitWeeks,
  weekRange,
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

const makeItem = makeSocialCalendarItem;
const monthMock = (month: string, items = [makeItem()]) => socialCalendarMock(gridRange(monthWeeks(month)), items);
const weekMock = (day: string, items = [makeItem()]) => socialCalendarMock(gridRange([weekRange(day)]), items);
const dayMock = (day: string, items = [makeItem()]) => socialCalendarMock(gridRange([dayRange(day)]), items);

/** Hover long enough for MUI's tooltip delay, then settle. */
const hover = async (element: HTMLElement) => {
  fireEvent.mouseOver(element);
  await act(() => new Promise((resolve) => setTimeout(resolve, 250)));
};

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

  it('finds the Monday-first week of any day, across a month end and a year end', () => {
    expect(weekRange('2026-09-15')).toEqual(['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18', '2026-09-19', '2026-09-20']);
    expect(weekRange('2026-09-30')).toEqual(['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
    // A Sunday belongs to the week that started the previous Monday.
    expect(weekRange('2026-11-01')).toEqual(['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01']);
    expect(weekRange('2027-01-01')).toEqual(['2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03']);
  });

  it('wraps one day as a row and picks the rows for each unit', () => {
    expect(dayRange('2026-09-15')).toEqual(['2026-09-15']);
    expect(unitWeeks('MONTH', '2026-09-15')).toEqual(monthWeeks('2026-09'));
    expect(unitWeeks('WEEK', '2026-09-30')).toEqual([weekRange('2026-09-30')]);
    expect(unitWeeks('DAY', '2026-09-15')).toEqual([['2026-09-15']]);
  });

  it('steps the anchor by a month, a week or a day, across month and year ends', () => {
    expect(shift('MONTH', '2026-09-15', 1)).toBe('2026-10-15');
    expect(shift('MONTH', '2026-12-15', 1)).toBe('2027-01-15');
    expect(shift('MONTH', '2026-01-31', 1)).toBe('2026-02-28');
    expect(shift('MONTH', '2026-01-15', -1)).toBe('2025-12-15');
    expect(shift('WEEK', '2026-09-15', 1)).toBe('2026-09-22');
    expect(shift('WEEK', '2026-09-03', -1)).toBe('2026-08-27');
    expect(shift('DAY', '2026-09-30', 1)).toBe('2026-10-01');
    expect(shift('DAY', '2026-01-01', -1)).toBe('2025-12-31');
  });

  it('moves between months across a year boundary and names them', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(monthTitle('2026-09')).toBe('September 2026');
  });

  it('names no month for a month that is not a real one, instead of throwing', () => {
    expect(monthTitle('')).toBe('');
    expect(monthTitle('2026-13')).toBe('');
    expect(monthTitle('soon')).toBe('');
  });

  it('names weekdays, day numbers and days', () => {
    expect(weekdayNames(['2026-08-31', '2026-09-01'])).toEqual(['Mon', 'Tue']);
    expect(mondayFirstWeekdays()).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    expect(dayNumber('2026-09-07')).toBe(7);
    expect(dayTitle('2026-09-17')).toBe('Thursday 17 September');
  });

  it('covers the grid from its first day up to the day after its last, for a month, a week and a day', () => {
    expect(gridRange(monthWeeks('2026-09'))).toEqual({
      from: new Date(2026, 7, 31).toISOString(),
      to: new Date(2026, 9, 5).toISOString(),
    });
    expect(gridRange([weekRange('2026-09-15')])).toEqual({
      from: new Date(2026, 8, 14).toISOString(),
      to: new Date(2026, 8, 21).toISOString(),
    });
    expect(gridRange([dayRange('2026-09-15')])).toEqual({
      from: new Date(2026, 8, 15).toISOString(),
      to: new Date(2026, 8, 16).toISOString(),
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
    expect(within(button).queryByTestId('social-calendar-item-media')).not.toBeInTheDocument();
    fireEvent.click(button);
    expect(onOpen).toHaveBeenCalledWith(item);
  });

  it('labels a failed post as failed', () => {
    renderWithProviders(<CalendarItemButton item={makeItem({ status: 'FAILED' })} onOpen={vi.fn()} />);
    expect(screen.getByTestId('social-calendar-item-c1')).toHaveAccessibleName(/· Failed ·/);
  });

  it('shows how many items a carousel has, in the button and in its name', () => {
    renderWithProviders(<CalendarItemButton item={makeItem({ media_count: 3 })} onOpen={vi.fn()} />);
    const button = screen.getByTestId('social-calendar-item-c1');
    expect(within(button).getByTestId('social-calendar-item-media')).toHaveTextContent('3');
    expect(button).toHaveAccessibleName('at 10:00 · Scheduled · 3 media · Duncit Pages: Run club recap');
  });

  it('says nothing about media for a post with one item', () => {
    renderWithProviders(<CalendarItemButton item={makeItem({ media_count: 1 })} onOpen={vi.fn()} />);
    expect(screen.queryByTestId('social-calendar-item-media')).not.toBeInTheDocument();
    expect(screen.getByTestId('social-calendar-item-c1')).toHaveAccessibleName('at 10:00 · Scheduled · Duncit Pages: Run club recap');
  });

  it('names a post awaiting approval as such and explains it on hover, while keeping its own name', async () => {
    renderWithProviders(<CalendarItemButton item={makeItem({ status: 'PENDING_APPROVAL' })} onOpen={vi.fn()} />);
    const button = screen.getByTestId('social-calendar-item-c1');
    expect(button).toHaveAccessibleName(/· Awaiting approval ·/);
    await hover(button);
    const tip = screen.getByRole('tooltip');
    expect(tip).toHaveTextContent('Waiting for a manager to decide on the Approvals page.');
    expect(button).toHaveAttribute('aria-describedby', tip.id);
    expect(button).toHaveAccessibleName(/· Awaiting approval ·/);
  });

  it('has no tip on a post that is not waiting for anyone', async () => {
    renderWithProviders(<CalendarItemButton item={makeItem()} onOpen={vi.fn()} />);
    await hover(screen.getByTestId('social-calendar-item-c1'));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
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
      <CalendarAgenda days={['2026-09-03', '2026-09-04', '2026-09-10', '2026-09-20']} byDay={byDay} onOpen={onOpen} emptyText="Nothing" />,
    );
    const agenda = screen.getByTestId('social-calendar-agenda');
    expect(within(agenda).getAllByRole('heading').map((h) => h.textContent)).toEqual([
      'Thursday 3 September',
      'Sunday 20 September',
    ]);
    expect(screen.queryByText('Nothing')).not.toBeInTheDocument();
    fireEvent.click(within(agenda).getByTestId('social-calendar-item-x2'));
    expect(onOpen).toHaveBeenCalledWith(second);
  });

  it('says what it was told to when no day has a post', () => {
    renderWithProviders(<CalendarAgenda days={['2026-09-03']} byDay={new Map()} onOpen={vi.fn()} emptyText="Nothing this week" />);
    expect(screen.getByText('Nothing this week')).toBeInTheDocument();
    expect(screen.queryByTestId('social-calendar-agenda')).not.toBeInTheDocument();
  });
});

describe('CalendarView', () => {
  const later = makeItem({ id: 'late', at: '2026-09-03T18:00:00.000Z', text: 'Evening post' });
  const earlier = makeItem({ id: 'early', at: '2026-09-03T07:00:00.000Z', text: 'Morning post', kind: 'PUBLISHED', status: 'PUBLISHED' });
  const outside = makeItem({ id: 'aug', at: '2026-08-31T07:00:00.000Z', text: 'August post' });
  const heading = () => screen.getByRole('heading', { level: 2 });
  const unitButton = (name: string) => within(screen.getByTestId('social-calendar-unit')).getByRole('button', { name });

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
      mocks: [monthMock('2026-09', [later, earlier, outside])],
    });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(unitButton('Month')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('group', { name: 'Calendar range' })).toBeInTheDocument();
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
        monthMock('2026-09', []),
        monthMock('2026-10', [makeItem({ id: 'oct', at: '2026-10-08T09:00:00.000Z' })]),
        // cache-and-network: passing back through a month asks the network again.
        monthMock('2026-09', []),
        monthMock('2026-08', []),
        monthMock('2026-09', [makeItem({ id: 'back', at: '2026-09-21T09:00:00.000Z' })]),
      ],
    });
    expect(heading()).toHaveTextContent('September 2026');

    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(heading()).toHaveTextContent('October 2026');
    expect(await screen.findByTestId('social-calendar-item-oct')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(heading()).toHaveTextContent('August 2026');
    expect(screen.getByRole('table', { name: 'August 2026' })).toBeInTheDocument();
    expect(screen.getAllByRole('cell')).toHaveLength(42);

    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(heading()).toHaveTextContent('September 2026');
    expect(await screen.findByTestId('social-calendar-item-back')).toBeInTheDocument();
  });

  it('shows a week as one row of seven days, asks only for that week, and steps by a week across the month end', async () => {
    const onAdd = vi.fn();
    renderWithProviders(<CalendarView onAdd={onAdd} onOpen={vi.fn()} />, {
      mocks: [
        monthMock('2026-09', []),
        weekMock('2026-09-15', [makeItem({ id: 'wk', at: '2026-09-17T10:00:00.000Z', text: 'This week' })]),
        weekMock('2026-09-22', []),
        weekMock('2026-09-29', [makeItem({ id: 'oct', at: '2026-10-02T10:00:00.000Z', text: 'Next month already' })]),
      ],
    });
    fireEvent.click(unitButton('Week'));
    expect(unitButton('Week')).toHaveAttribute('aria-pressed', 'true');
    expect(heading()).toHaveTextContent('Week of 14/09/2026');
    const table = screen.getByRole('table', { name: 'Week of 14/09/2026' });
    expect(within(table).getAllByRole('cell')).toHaveLength(7);
    expect(within(table).getAllByRole('cell').map((cell) => cell.getAttribute('aria-label'))).toEqual([
      'Monday 14 September', 'Tuesday 15 September', 'Wednesday 16 September', 'Thursday 17 September',
      'Friday 18 September', 'Saturday 19 September', 'Sunday 20 September',
    ]);
    expect(await screen.findByTestId('social-calendar-item-wk')).toBeInTheDocument();
    expect(screen.queryByTestId('social-calendar-add-2026-09-14')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('social-calendar-add-2026-09-18'));
    expect(onAdd).toHaveBeenCalledWith('2026-09-18', '2026-09-15');

    fireEvent.click(screen.getByRole('button', { name: 'Next week' }));
    expect(heading()).toHaveTextContent('Week of 21/09/2026');
    fireEvent.click(screen.getByRole('button', { name: 'Next week' }));
    expect(heading()).toHaveTextContent('Week of 28/09/2026');
    await screen.findByTestId('social-calendar-item-oct');
    const straddling = screen.getByRole('table', { name: 'Week of 28/09/2026' });
    expect(within(straddling).getByRole('cell', { name: 'Friday 2 October' })).toHaveTextContent('Next month already');
    expect(screen.getByRole('button', { name: 'Previous week' })).toBeInTheDocument();
  });

  it('shows a day as its agenda with a way to add a post, steps by a day, and hides the add on a day gone by', async () => {
    const onAdd = vi.fn();
    const onOpen = vi.fn();
    const tomorrow = makeItem({ id: 'tmrw', at: '2026-09-16T09:30:00.000Z', text: 'Tomorrow post', media_count: 2 });
    renderWithProviders(<CalendarView onAdd={onAdd} onOpen={onOpen} />, {
      mocks: [
        monthMock('2026-09', []),
        dayMock('2026-09-15', []),
        dayMock('2026-09-16', [tomorrow]),
        dayMock('2026-09-15', []),
        dayMock('2026-09-14', []),
        dayMock('2026-09-15', []),
      ],
    });
    fireEvent.click(unitButton('Day'));
    expect(heading()).toHaveTextContent('15/09/2026');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    const dayView = screen.getByTestId('social-calendar-day');
    expect(await within(dayView).findByText('Nothing planned or posted on this day yet.')).toBeInTheDocument();
    const add = within(dayView).getByTestId('social-calendar-add-2026-09-15');
    expect(add).toHaveTextContent('Add a post on Tuesday 15 September');
    fireEvent.click(add);
    expect(onAdd).toHaveBeenCalledWith('2026-09-15', '2026-09-15');

    fireEvent.click(screen.getByRole('button', { name: 'Next day' }));
    expect(heading()).toHaveTextContent('16/09/2026');
    const item = await screen.findByTestId('social-calendar-item-tmrw');
    expect(within(screen.getByTestId('social-calendar-agenda')).getByRole('heading', { level: 3 })).toHaveTextContent('Wednesday 16 September');
    expect(within(item).getByTestId('social-calendar-item-media')).toHaveTextContent('2');
    fireEvent.click(item);
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'tmrw' }));

    fireEvent.click(screen.getByRole('button', { name: 'Previous day' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous day' }));
    expect(heading()).toHaveTextContent('14/09/2026');
    expect(screen.queryByTestId('social-calendar-add-2026-09-14')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(heading()).toHaveTextContent('15/09/2026');
    expect(screen.getByTestId('social-calendar-add-2026-09-15')).toBeInTheDocument();
  });

  it('keeps the day when switching from the week back to the month, and the month ignores the unit once pressed again', () => {
    renderWithProviders(<CalendarView onAdd={vi.fn()} onOpen={vi.fn()} />, {
      mocks: [monthMock('2026-09', []), weekMock('2026-09-15', []), weekMock('2026-09-22', []), monthMock('2026-09', [])],
    });
    fireEvent.click(unitButton('Week'));
    fireEvent.click(screen.getByRole('button', { name: 'Next week' }));
    expect(heading()).toHaveTextContent('Week of 21/09/2026');
    fireEvent.click(unitButton('Month'));
    expect(heading()).toHaveTextContent('September 2026');
    // Pressing the chosen unit again is not a change.
    fireEvent.click(unitButton('Month'));
    expect(unitButton('Month')).toHaveAttribute('aria-pressed', 'true');
    expect(heading()).toHaveTextContent('September 2026');
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
      mocks: [monthMock('2026-09', [later, earlier, outside])],
    });
    const agenda = await screen.findByTestId('social-calendar-agenda');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(within(agenda).getAllByRole('heading').map((h) => h.textContent)).toEqual(['Thursday 3 September']);
    expect(within(agenda).queryByText('August post')).not.toBeInTheDocument();
  });

  it('reads a week as an agenda on a phone, with its own empty line', async () => {
    asPhone();
    renderWithProviders(<CalendarView onAdd={vi.fn()} onOpen={vi.fn()} />, {
      mocks: [
        monthMock('2026-09', []),
        weekMock('2026-09-15', []),
        weekMock('2026-09-22', [makeItem({ id: 'wk2', at: '2026-09-25T10:00:00.000Z', text: 'Friday post' })]),
      ],
    });
    fireEvent.click(unitButton('Week'));
    expect(heading()).toHaveTextContent('Week of 14/09/2026');
    expect(await screen.findByText('Nothing planned or posted this week yet.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next week' }));
    const agenda = await screen.findByTestId('social-calendar-agenda');
    expect(within(agenda).getAllByRole('heading').map((h) => h.textContent)).toEqual(['Friday 25 September']);
    expect(within(agenda).getByText('Friday post')).toBeInTheDocument();
  });
});
