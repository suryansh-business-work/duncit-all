import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { format } from 'date-fns';
import { PUBLIC_APP_SETTINGS } from '@duncit/app-settings';
import UserActivitySection from '../UserActivitySection';
import {
  DELETE_USER_ACTIVITY_DAY,
  DELETE_USER_ACTIVITY_YEAR,
  USER_ACTIVITY_YEAR,
  USER_CLICKSTREAM,
} from '../queries';
import { renderWithProviders } from './testkit';

// jsdom ships no `CSS.supports`; react-activity-calendar calls it to validate the
// theme colours. Every colour the section passes is a plain hex, so "supported"
// is the honest answer.
Object.defineProperty(globalThis, 'CSS', {
  value: { ...globalThis.CSS, supports: () => true },
  writable: true,
  configurable: true,
});

// jsdom has no `matchMedia` either. The admin portal is a desktop app, so the
// only query that matches is the fine-pointer one MUI X uses to choose the
// desktop date picker; the calendar's dark-scheme query stays unmatched.
Object.defineProperty(window, 'matchMedia', {
  value: (query: string) => ({
    matches: query.includes('pointer: fine'),
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }),
  writable: true,
  configurable: true,
});

const USER_ID = 'u-7';
// The section defaults to the calendar year the admin is looking at right now.
const YEAR = new Date().getFullYear();

const day = (date: string, count: number) => ({
  __typename: 'UserActivityDay',
  date,
  count,
  // The server's own level is deliberately wrong here: the client recomputes it.
  level: 0,
});

interface YearMockOptions {
  year?: number;
  totalVisits?: number;
  availableYears?: number[];
  days?: ReturnType<typeof day>[];
}

const activityYearMock = (options: YearMockOptions = {}): MockedResponse => {
  const year = options.year ?? YEAR;
  return {
    request: { query: USER_ACTIVITY_YEAR, variables: { user_id: USER_ID, year } },
    result: {
      data: {
        userActivityYear: {
          __typename: 'UserActivityYear',
          user_id: USER_ID,
          year,
          available_years: options.availableYears ?? [year],
          total_visits: options.totalVisits ?? 0,
          days: options.days ?? [],
        },
      },
    },
  };
};

const settingsMock: MockedResponse = {
  request: { query: PUBLIC_APP_SETTINGS },
  result: {
    data: {
      publicAppSettings: {
        __typename: 'PublicAppSettings',
        date_format: 'MM/dd/yyyy',
        time_format: 'hh:mm a',
        time_zone: 'Asia/Kolkata',
        time_source: 'BROWSER',
        custom_time: null,
        custom_time_set_at: null,
        server_time: null,
        min_birth_year: 1950,
        max_birth_year: 2010,
        draft_retention_days: 30,
      },
    },
  },
};

const clickstreamMock = (date: string): MockedResponse => ({
  request: { query: USER_CLICKSTREAM, variables: { user_id: USER_ID, date, limit: 500 } },
  result: { data: { userClickstream: [] } },
});

const levelOf = (container: HTMLElement, date: string) =>
  container.querySelector(`rect[data-date="${date}"]`)?.getAttribute('data-level');

const renderSection = (mocks: MockedResponse[]) =>
  renderWithProviders(<UserActivitySection userId={USER_ID} />, {
    mocks: [settingsMock, ...mocks],
  });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('UserActivitySection — year summary', () => {
  it('shows a spinner first, then the visit total for the selected year', async () => {
    renderSection([activityYearMock({ totalVisits: 12 })]);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText(`12 visits recorded in ${YEAR}.`)).toBeInTheDocument(),
    );
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('falls back to zero visits when the server has no record for the year', async () => {
    renderSection([activityYearMock()]);

    await waitFor(() =>
      expect(screen.getByText(`0 visits recorded in ${YEAR}.`)).toBeInTheDocument(),
    );
  });

  it('shows the server error instead of failing silently', async () => {
    renderSection([
      {
        request: { query: USER_ACTIVITY_YEAR, variables: { user_id: USER_ID, year: YEAR } },
        error: new Error('Activity service unavailable'),
      },
    ]);

    await waitFor(() =>
      expect(screen.getByText('Activity service unavailable')).toBeInTheDocument(),
    );
  });

  it('lists every year the user has activity for and reloads on switching', async () => {
    renderSection([
      activityYearMock({ totalVisits: 12, availableYears: [YEAR, YEAR - 1] }),
      activityYearMock({ year: YEAR - 1, totalVisits: 40, availableYears: [YEAR, YEAR - 1] }),
    ]);

    await waitFor(() =>
      expect(screen.getByText(`12 visits recorded in ${YEAR}.`)).toBeInTheDocument(),
    );
    fireEvent.mouseDown(screen.getByLabelText('Year'));
    fireEvent.click(within(screen.getByRole('listbox')).getByText(String(YEAR - 1)));

    await waitFor(() =>
      expect(screen.getByText(`40 visits recorded in ${YEAR - 1}.`)).toBeInTheDocument(),
    );
  }, 30000);
});

describe('UserActivitySection — calendar', () => {
  it('recomputes the heat level from the raw count for every bucket', async () => {
    const { container } = renderSection([
      activityYearMock({
        totalVisits: 31,
        days: [
          day(`${YEAR}-03-01`, 0),
          day(`${YEAR}-03-02`, 1),
          day(`${YEAR}-03-03`, 3),
          day(`${YEAR}-03-04`, 7),
          day(`${YEAR}-03-05`, 20),
        ],
      }),
    ]);

    await waitFor(() => expect(container.querySelector('rect[data-date]')).not.toBeNull());
    expect(levelOf(container, `${YEAR}-03-01`)).toBe('0');
    expect(levelOf(container, `${YEAR}-03-02`)).toBe('1');
    expect(levelOf(container, `${YEAR}-03-03`)).toBe('2');
    expect(levelOf(container, `${YEAR}-03-04`)).toBe('3');
    expect(levelOf(container, `${YEAR}-03-05`)).toBe('4');
    // Days the server said nothing about are still drawn, at level 0.
    expect(levelOf(container, `${YEAR}-06-15`)).toBe('0');
  }, 30000);

  it('labels each day with a pluralised event count', async () => {
    renderSection([
      activityYearMock({ totalVisits: 4, days: [day(`${YEAR}-03-02`, 1), day(`${YEAR}-03-03`, 3)] }),
    ]);

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: `1 event on ${YEAR}-03-02` }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: `3 events on ${YEAR}-03-03` })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: `0 events on ${YEAR}-03-04` })).toBeInTheDocument();
  }, 30000);

  it('opens the journey dialog for the day that was clicked', async () => {
    renderSection([
      activityYearMock({ totalVisits: 3, days: [day(`${YEAR}-03-03`, 3)] }),
      clickstreamMock(`${YEAR}-03-03`),
    ]);

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: `3 events on ${YEAR}-03-03` }),
      ).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('button', { name: `3 events on ${YEAR}-03-03` }));

    await waitFor(() =>
      expect(screen.getByText(`User Journey · ${YEAR}-03-03`)).toBeInTheDocument(),
    );
  }, 30000);
});

describe('UserActivitySection — deletions', () => {
  it('enables Delete Day only after a day is picked, then deletes and clears it', async () => {
    const onDeleteDay = vi.fn();
    renderSection([
      activityYearMock({ totalVisits: 3, days: [day(`${YEAR}-03-03`, 3)] }),
      clickstreamMock(`${YEAR}-03-03`),
      {
        request: {
          query: DELETE_USER_ACTIVITY_DAY,
          variables: { user_id: USER_ID, date: `${YEAR}-03-03` },
        },
        result: () => {
          onDeleteDay();
          return { data: { deleteUserActivityDay: true } };
        },
      },
      activityYearMock({ totalVisits: 0 }),
    ]);

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: `3 events on ${YEAR}-03-03` }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: 'Delete Day' })).toBeDisabled();

    // Clicking a day both arms the delete field and opens the journey; dismiss
    // the journey so the page behind it is interactive again.
    fireEvent.click(screen.getByRole('button', { name: `3 events on ${YEAR}-03-03` }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    await waitFor(() => expect(screen.getByRole('button', { name: 'Delete Day' })).toBeEnabled());

    fireEvent.click(screen.getByRole('button', { name: 'Delete Day' }));
    await waitFor(() => expect(onDeleteDay).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Delete Day' })).toBeDisabled());
    await waitFor(() =>
      expect(screen.getByText(`0 visits recorded in ${YEAR}.`)).toBeInTheDocument(),
    );
  }, 30000);

  it('deletes the day chosen from the date picker calendar', async () => {
    const onDeleteDay = vi.fn();
    const today = new Date();
    const isoToday = format(today, 'yyyy-MM-dd');
    renderSection([
      activityYearMock({ totalVisits: 5 }),
      {
        request: {
          query: DELETE_USER_ACTIVITY_DAY,
          variables: { user_id: USER_ID, date: isoToday },
        },
        result: () => {
          onDeleteDay();
          return { data: { deleteUserActivityDay: true } };
        },
      },
      activityYearMock({ totalVisits: 0 }),
    ]);

    await waitFor(() =>
      expect(screen.getByText(`5 visits recorded in ${YEAR}.`)).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('button', { name: /choose date/i }));
    const grid = await screen.findByRole('grid');
    fireEvent.click(within(grid).getByRole('gridcell', { name: String(today.getDate()) }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Delete Day' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Delete Day' }));

    await waitFor(() => expect(onDeleteDay).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByText(`0 visits recorded in ${YEAR}.`)).toBeInTheDocument(),
    );
  }, 30000);

  it('asks before wiping a whole year and does nothing when the admin cancels', async () => {
    const onDeleteYear = vi.fn();
    renderSection([
      activityYearMock({ totalVisits: 12 }),
      {
        request: { query: DELETE_USER_ACTIVITY_YEAR, variables: { user_id: USER_ID, year: YEAR } },
        result: () => {
          onDeleteYear();
          return { data: { deleteUserActivityYear: true } };
        },
      },
    ]);

    await waitFor(() =>
      expect(screen.getByText(`12 visits recorded in ${YEAR}.`)).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Delete Year' }));

    await waitFor(() => expect(screen.getByText('Delete activity')).toBeInTheDocument());
    expect(
      screen.getByText(`Delete all ${YEAR} activity for this user?`),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByText('Delete activity')).toBeNull());
    expect(onDeleteYear).not.toHaveBeenCalled();
    expect(screen.getByText(`12 visits recorded in ${YEAR}.`)).toBeInTheDocument();
  }, 30000);

  it('wipes the year and reloads once the admin confirms', async () => {
    const onDeleteYear = vi.fn();
    renderSection([
      activityYearMock({ totalVisits: 12 }),
      {
        request: { query: DELETE_USER_ACTIVITY_YEAR, variables: { user_id: USER_ID, year: YEAR } },
        result: () => {
          onDeleteYear();
          return { data: { deleteUserActivityYear: true } };
        },
      },
      activityYearMock({ totalVisits: 0 }),
    ]);

    await waitFor(() =>
      expect(screen.getByText(`12 visits recorded in ${YEAR}.`)).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Delete Year' }));
    await waitFor(() => expect(screen.getByText('Delete activity')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(onDeleteYear).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByText(`0 visits recorded in ${YEAR}.`)).toBeInTheDocument(),
    );
  }, 30000);
});
