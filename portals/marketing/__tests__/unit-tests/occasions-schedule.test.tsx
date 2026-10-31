import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../testkit';
import {
  makeLive,
  makeLook,
  makeSettings,
  occasionLiveErrorMock,
  occasionLiveMock,
  occasionThemesErrorMock,
  occasionThemesMock,
  setOccasionScheduleErrorMock,
  setOccasionScheduleMock,
} from '../mocks/occasions-live.mock';

const NOW = new Date('2026-11-03T12:00:00.000Z');
const now = () => NOW;
const dialogsMock = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notify: dialogsMock.notify,
}));
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDateTime: (d: Date | string) => `fmt:${String(d)}`, now }),
}));
vi.mock('../../src/components/DateTimeField', async () => ({
  default: (await import('../mocks/occasions-live.mock')).DateTimeFieldStub,
}));

import ScheduleTab from '../../src/pages/occasions-page/schedule/ScheduleTab';
import { scheduleRows, windowState } from '../../src/pages/occasions-page/schedule/scheduleOrder';

afterEach(() => {
  vi.clearAllMocks();
});

const NAVRATRI = makeLook({ key: 'navratri', name: 'Navratri', starts_at: '2026-10-20T00:00:00.000Z', ends_at: '2026-11-10T00:00:00.000Z', sort_order: 5 });
const DIWALI = makeLook();
const CHRISTMAS = makeLook({
  key: 'christmas',
  name: 'Christmas',
  starts_at: '2026-12-20T00:00:00.000Z',
  ends_at: '2026-12-26T00:00:00.000Z',
  schedule_enabled: false,
});
const NEW_YEAR = makeLook({ key: 'new-year', name: 'New Year', starts_at: '2026-12-31T00:00:00.000Z', ends_at: '2027-01-01T06:00:00.000Z' });
const HOLI = makeLook({ key: 'holi', name: 'Holi', starts_at: '2026-03-01T00:00:00.000Z', ends_at: '2026-03-05T00:00:00.000Z' });
const HALLOWEEN = makeLook({ key: 'halloween', name: 'Halloween', starts_at: '2026-10-25T00:00:00.000Z', ends_at: '2026-10-31T23:00:00.000Z' });
const ZETA = makeLook({ key: 'zeta', name: 'Zeta look', starts_at: null, ends_at: null, schedule_enabled: false });
const ALPHA = makeLook({ key: 'alpha', name: 'Alpha look', starts_at: '2026-11-01T00:00:00.000Z', ends_at: null, schedule_enabled: false });
const ARCHIVED = makeLook({ key: 'old', name: 'Old look', is_archived: true });

const ALL = [ZETA, HOLI, DIWALI, ARCHIVED, NEW_YEAR, ALPHA, HALLOWEEN, CHRISTMAS, NAVRATRI];

describe('windowState', () => {
  it('reads a window against the clock, at its very edges too', () => {
    expect(windowState({ starts_at: '2026-11-01T00:00:00.000Z', ends_at: '2026-11-05T00:00:00.000Z' }, NOW)).toBe('RUNNING');
    expect(windowState({ starts_at: NOW.toISOString(), ends_at: '2026-11-05T00:00:00.000Z' }, NOW)).toBe('RUNNING');
    expect(windowState({ starts_at: '2026-11-04T00:00:00.000Z', ends_at: '2026-11-05T00:00:00.000Z' }, NOW)).toBe('UPCOMING');
    expect(windowState({ starts_at: '2026-11-01T00:00:00.000Z', ends_at: NOW.toISOString() }, NOW)).toBe('ENDED');
  });

  it('calls a window with a missing or unreadable end unscheduled', () => {
    expect(windowState({ starts_at: '2026-11-01T00:00:00.000Z', ends_at: null }, NOW)).toBe('UNSCHEDULED');
    expect(windowState({ starts_at: undefined, ends_at: '2026-11-05T00:00:00.000Z' }, NOW)).toBe('UNSCHEDULED');
    expect(windowState({ starts_at: 'not a date', ends_at: '2026-11-05T00:00:00.000Z' }, NOW)).toBe('UNSCHEDULED');
  });
});

describe('scheduleRows', () => {
  it('lists running looks then upcoming by start, then the latest ended, then undated ones by name, and leaves archived looks out', () => {
    const rows = scheduleRows(ALL, NOW);
    expect(rows.map((row) => [row.look.name, row.state])).toEqual([
      ['Navratri', 'RUNNING'],
      ['Diwali', 'RUNNING'],
      ['Christmas', 'UPCOMING'],
      ['New Year', 'UPCOMING'],
      ['Halloween', 'ENDED'],
      ['Holi', 'ENDED'],
      ['Alpha look', 'UNSCHEDULED'],
      ['Zeta look', 'UNSCHEDULED'],
    ]);
    // The rows carry the look itself, unchanged.
    expect(rows[1].look).toBe(DIWALI);
  });

  it('gives nothing for no looks', () => {
    expect(scheduleRows([], NOW)).toEqual([]);
  });
});

const renderTab = (mocks: MockedResponse[]) =>
  renderWithProviders(<ScheduleTab />, { mocks, initialEntries: ['/occasions?selectedtab=schedule'] });

describe('ScheduleTab', () => {
  it('waits for the looks, then lists them in calendar order with their windows, standing and priority', async () => {
    renderTab([occasionThemesMock(ALL), occasionLiveMock(makeLive(), makeSettings({ mode: 'NORMAL' }))]);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    const list = await screen.findByRole('list', { name: 'Looks by date' });
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(within(list).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Navratri',
      'Diwali',
      'Christmas',
      'New Year',
      'Halloween',
      'Holi',
      'Alpha look',
      'Zeta look',
    ]);
    const items = within(list).getAllByRole('listitem');
    const diwali = items[1];
    expect(within(diwali).getByText('fmt:2026-11-01T00:00:00.000Z to fmt:2026-11-05T00:00:00.000Z')).toBeInTheDocument();
    expect(within(diwali).getByText('On now')).toBeInTheDocument();
    expect(within(diwali).getByText('Schedule on')).toBeInTheDocument();
    expect(within(diwali).getByText('Priority 10')).toBeInTheDocument();
    expect(within(items[2]).getByText('Upcoming')).toBeInTheDocument();
    expect(within(items[2]).getByText('Schedule off')).toBeInTheDocument();
    expect(within(items[4]).getByText('Ended')).toBeInTheDocument();
    expect(within(items[6]).getByText('No dates')).toBeInTheDocument();
    // A look with only one end has no window to show.
    expect(within(items[6]).getByText('No dates set')).toBeInTheDocument();
    expect(screen.queryByText('There are no looks to schedule.')).not.toBeInTheDocument();
  });

  it('says dates only count in Automatic mode, names the mode, and links to change it', async () => {
    renderTab([occasionThemesMock([DIWALI]), occasionLiveMock(makeLive(), makeSettings({ mode: 'NORMAL' }))]);
    expect(await screen.findByText(/The live mode is Normal right now\./)).toBeInTheDocument();
    expect(screen.getByText(/Dates only switch a look on while the live mode is Automatic by schedule\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Change live mode' })).toHaveAttribute('href', '/occasions?selectedtab=live');
  });

  it('offers no mode change once the schedule is already in charge', async () => {
    renderTab([occasionThemesMock([DIWALI]), occasionLiveMock(makeLive({ mode: 'SCHEDULE' }), makeSettings({ mode: 'SCHEDULE' }))]);
    expect(await screen.findByText(/The live mode is Automatic by schedule right now\./)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Change live mode' })).not.toBeInTheDocument();
  });

  it('still explains the schedule and offers the mode change when the live mode cannot be read', async () => {
    renderTab([occasionThemesMock([DIWALI]), occasionLiveErrorMock('live is down')]);
    expect(await screen.findByRole('heading', { level: 3, name: 'Diwali' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('link', { name: 'Change live mode' })).toBeInTheDocument());
    expect(screen.queryByText(/right now\./)).not.toBeInTheDocument();
  });

  it('shows why the looks could not be read', async () => {
    renderTab([occasionThemesErrorMock('looks are down'), occasionLiveMock(makeLive(), makeSettings())]);
    expect(await screen.findByText('looks are down')).toBeInTheDocument();
    expect(screen.queryByText('There are no looks to schedule.')).not.toBeInTheDocument();
  });

  it('says there is nothing to schedule when every look is archived', async () => {
    renderTab([occasionThemesMock([ARCHIVED]), occasionLiveMock(makeLive(), makeSettings())]);
    expect(await screen.findByText('There are no looks to schedule.')).toBeInTheDocument();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('edits a look’s window, saves it, says so and closes', async () => {
    const input = { starts_at: DIWALI.starts_at, ends_at: DIWALI.ends_at, sort_order: 20, schedule_enabled: true };
    renderTab([
      occasionThemesMock([DIWALI], 2),
      occasionLiveMock(makeLive(), makeSettings(), 2),
      setOccasionScheduleMock('diwali', input),
    ]);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit dates for Diwali' }));
    const dialog = await screen.findByRole('dialog', { name: 'Dates for Diwali' });
    fireEvent.change(within(dialog).getByLabelText(/^Priority/), { target: { value: '20' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Dates saved.', 'success'));
    await waitFor(() => expect(screen.queryByTestId('occasion-schedule-form')).not.toBeInTheDocument());
  });

  it('keeps the dialog open with the server’s reason when the save fails, and closes on cancel', async () => {
    const input = { starts_at: DIWALI.starts_at, ends_at: DIWALI.ends_at, sort_order: 11, schedule_enabled: true };
    renderTab([
      occasionThemesMock([DIWALI]),
      occasionLiveMock(makeLive(), makeSettings()),
      setOccasionScheduleErrorMock('diwali', input, 'dates clash'),
    ]);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit dates for Diwali' }));
    const dialog = await screen.findByRole('dialog', { name: 'Dates for Diwali' });
    fireEvent.change(within(dialog).getByLabelText(/^Priority/), { target: { value: '11' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('dates clash', 'error'));
    expect(screen.getByTestId('occasion-schedule-form')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByTestId('occasion-schedule-form')).not.toBeInTheDocument());
  });
});
