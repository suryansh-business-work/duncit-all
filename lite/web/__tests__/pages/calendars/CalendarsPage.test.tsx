import { screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { describe, expect, it } from 'vitest';
import type { LiteCalendar } from '../../../../shared/graphql/documents';
import { LITE_MY_CALENDARS, LITE_SUBSCRIBED_CALENDARS } from '../../../graphql/calendars';
import { CalendarsPage } from '../../../pages/calendars';
import { calendarFixture, meFixture, renderWithProviders } from '../../test-utils';

const mineMock = (rows: LiteCalendar[]): MockedResponse => ({ request: { query: LITE_MY_CALENDARS }, result: { data: { liteMyCalendars: rows } } });
const followedMock = (rows: LiteCalendar[]): MockedResponse => ({ request: { query: LITE_SUBSCRIBED_CALENDARS }, result: { data: { liteSubscribedCalendars: rows } } });

const owned = calendarFixture({ id: 'cal-1', slug: 'run-club', name: 'Run Club', subscriber_count: 3, upcoming_count: 1, viewer_is_owner: true });
const followed = calendarFixture({ id: 'cal-2', slug: 'book-nook', name: 'Book Nook', description: 'Monthly reads.', viewer_subscribed: true });

describe('CalendarsPage', () => {
  it('asks a visitor to sign in before showing any calendars', async () => {
    renderWithProviders(<CalendarsPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Calendars' })).toBeInTheDocument();
    expect(await screen.findByTestId('signed-in-gate')).toHaveTextContent('Sign in to see your calendars.');
    expect(screen.queryByTestId('my-calendars-section')).not.toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe('Calendars | Duncit Lite'));
  });

  it('lists the calendars the reader owns, each opening its page with Edit beside it', async () => {
    renderWithProviders(<CalendarsPage />, { me: meFixture(), mocks: [mineMock([owned]), followedMock([])] });
    const mine = await screen.findByRole('region', { name: 'My calendars' });
    const card = await within(mine).findByTestId('my-calendar-card');
    expect(within(card).getByRole('heading', { level: 3, name: 'Run Club' })).toBeInTheDocument();
    expect(within(card).getByText('3 subscribers')).toBeInTheDocument();
    expect(within(card).getByText('1 upcoming')).toBeInTheDocument();
    expect(within(card).getByTestId('my-calendar-view')).toHaveAttribute('href', '/cal/run-club');
    expect(within(card).getByRole('link', { name: 'Edit Run Club' })).toHaveAttribute('href', '/calendars/cal-1/edit');
    expect(within(mine).getByRole('link', { name: 'Create' })).toHaveAttribute('href', '/calendars/new');
  });

  it('lists the calendars the reader follows, with Following to stop', async () => {
    renderWithProviders(<CalendarsPage />, { me: meFixture(), mocks: [mineMock([]), followedMock([followed])] });
    const section = await screen.findByRole('region', { name: 'Subscribed calendars' });
    const card = await within(section).findByTestId('calendar-card');
    expect(within(card).getByRole('link')).toHaveAttribute('href', '/cal/book-nook');
    expect(within(card).getByText('Monthly reads.')).toBeInTheDocument();
    expect(within(section).getByTestId('calendar-follow')).toBeInTheDocument();
  });

  it('says so when the reader owns and follows nothing, and points at Discover', async () => {
    renderWithProviders(<CalendarsPage />, { me: meFixture(), mocks: [mineMock([]), followedMock([])] });
    expect(await screen.findByTestId('my-calendars-empty')).toHaveTextContent('No calendars yet');
    const empty = await screen.findByTestId('subscribed-calendars-empty');
    expect(empty).toHaveTextContent('No subscriptions yet');
    expect(within(empty).getByRole('link', { name: 'Discover calendars' })).toHaveAttribute('href', '/discover');
  });

  it('shows the API’s message in the section that could not be read, leaving the other one working', async () => {
    const refused: MockedResponse = { request: { query: LITE_SUBSCRIBED_CALENDARS }, result: { errors: [{ message: 'Subscriptions are resting' }] } };
    renderWithProviders(<CalendarsPage />, { me: meFixture(), mocks: [mineMock([owned]), refused] });
    const section = await screen.findByRole('region', { name: 'Subscribed calendars' });
    expect(await within(section).findByTestId('query-guard-error')).toHaveTextContent('Subscriptions are resting');
    expect(await screen.findByTestId('my-calendar-card')).toBeInTheDocument();
  });
});
