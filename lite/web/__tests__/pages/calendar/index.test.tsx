import type { MockedResponse } from '@apollo/client/testing';
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { LiteCalendar, LiteEventCard } from '../../../../shared/graphql/documents';
import { LITE_CALENDAR, LITE_CALENDAR_EVENTS, LITE_SUBSCRIBE_CALENDAR } from '../../../graphql/calendars';
import { CalendarPage } from '../../../pages/calendar';
import { calendarFixture, eventCardFixture, meFixture, renderWithProviders, type RenderOptions } from '../../test-utils';

const calendarMock = (liteCalendar: LiteCalendar | null): MockedResponse => ({ request: { query: LITE_CALENDAR, variables: { slug: 'run-club' } }, result: { data: { liteCalendar } } });
const eventsMock = (past: boolean, rows: LiteEventCard[]): MockedResponse => ({
  request: { query: LITE_CALENDAR_EVENTS, variables: { slug: 'run-club', past } },
  result: { data: { liteCalendarEvents: rows } },
});

const renderPage = (mocks: MockedResponse[], options: RenderOptions = {}) =>
  renderWithProviders(<CalendarPage />, { route: '/cal/run-club', path: '/cal/:slug', ...options, mocks });

describe('CalendarPage', () => {
  it('shows the calendar and its upcoming events, and names the tab after it', async () => {
    renderPage([calendarMock(calendarFixture({ description: 'Saturday 6am runs.' })), eventsMock(false, [eventCardFixture({ title: 'Lodhi 5K' })])]);
    expect(await screen.findByRole('heading', { level: 1, name: 'Run Club' })).toBeInTheDocument();
    expect(await screen.findByText('Lodhi 5K')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Upcoming' })).toHaveAttribute('aria-selected', 'true');
    expect(within(screen.getByRole('tabpanel')).getByText('Lodhi 5K')).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe('Run Club | Duncit Lite'));
  });

  it('switches to past events from the tab strip, keeping the choice in the URL', async () => {
    const { user, router } = renderPage([calendarMock(calendarFixture()), eventsMock(false, [eventCardFixture()]), eventsMock(true, [])]);
    await user.click(await screen.findByRole('tab', { name: 'Past' }));
    expect(await screen.findByText('No past events')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Past' })).toHaveAttribute('aria-selected', 'true');
    expect(router.state.location.search).toBe('?selectedtab=past');
  });

  it('says when nothing is coming up', async () => {
    renderPage([calendarMock(calendarFixture()), eventsMock(false, [])]);
    expect(await screen.findByText('No upcoming events')).toBeInTheDocument();
  });

  it('says not found for an unknown calendar', async () => {
    renderPage([calendarMock(null)]);
    expect(await screen.findByTestId('not-found')).toHaveTextContent('We could not find that');
    expect(screen.queryByTestId('calendar-page')).not.toBeInTheDocument();
  });

  it('shows the API’s reason when the calendar cannot be read', async () => {
    renderPage([{ request: { query: LITE_CALENDAR, variables: { slug: 'run-club' } }, result: { errors: [{ message: 'Calendars are unavailable' }] } }]);
    expect(await screen.findByTestId('query-guard-error')).toHaveTextContent('Calendars are unavailable');
  });

  it('reloads the calendar after the reader subscribes', async () => {
    const { user } = renderPage(
      [
        calendarMock(calendarFixture({ subscriber_count: 4 })),
        eventsMock(false, []),
        { request: { query: LITE_SUBSCRIBE_CALENDAR, variables: { id: 'cal-1' } }, result: { data: { liteSubscribeCalendar: calendarFixture({ viewer_subscribed: true, subscriber_count: 5 }) } } },
        // The reload answers with what the server holds now, including someone else's subscription.
        calendarMock(calendarFixture({ viewer_subscribed: true, subscriber_count: 6 })),
      ],
      { me: meFixture() },
    );
    await user.click(await screen.findByRole('button', { name: 'Subscribe' }));
    expect(await screen.findByRole('button', { name: 'Unsubscribe' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('link', { name: 'Asha Rao' }).parentElement).toHaveTextContent('6 subscribers'));
  });
});
