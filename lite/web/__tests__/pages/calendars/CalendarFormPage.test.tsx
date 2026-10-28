import type { MockedResponse } from '@apollo/client/testing';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { LiteCalendar } from '../../../../shared/graphql/documents';
import { LITE_MY_CALENDARS } from '../../../graphql/calendars';
import { LITE_CITIES } from '../../../graphql/discover';
import { CalendarFormPage } from '../../../pages/calendars';
import { calendarFixture, cityFixture, meFixture, renderWithProviders } from '../../test-utils';

const citiesMock: MockedResponse = { request: { query: LITE_CITIES }, result: { data: { liteCities: [cityFixture()] } }, maxUsageCount: Number.POSITIVE_INFINITY };
const myCalendars = (rows: LiteCalendar[]): MockedResponse => ({ request: { query: LITE_MY_CALENDARS }, result: { data: { liteMyCalendars: rows } } });

const renderEdit = (mocks: MockedResponse[]) =>
  renderWithProviders(<CalendarFormPage />, { me: meFixture(), mocks: [citiesMock, ...mocks], route: '/calendars/cal-1/edit', path: '/calendars/:id/edit' });

describe('CalendarFormPage', () => {
  it('asks a signed-out visitor to sign in', () => {
    renderWithProviders(<CalendarFormPage />, { route: '/calendars/new', path: '/calendars/new' });
    expect(screen.getByRole('heading', { level: 1, name: 'New calendar' })).toBeInTheDocument();
    expect(screen.getByTestId('signed-in-gate')).toHaveTextContent('Sign in to see your calendars.');
    expect(screen.queryByTestId('calendar-form')).not.toBeInTheDocument();
  });

  it('shows a blank form at /calendars/new', () => {
    renderWithProviders(<CalendarFormPage />, { me: meFixture(), mocks: [citiesMock], route: '/calendars/new', path: '/calendars/new' });
    expect(screen.getByRole('heading', { level: 1, name: 'New calendar' })).toBeInTheDocument();
    expect(screen.getByText('A calendar has its own page and a feed people can subscribe to.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('');
    expect(document.title).toBe('New calendar | Duncit Lite');
  });

  it('loads one of the reader’s calendars to edit', async () => {
    renderEdit([myCalendars([calendarFixture({ id: 'cal-0', name: 'Book Club', slug: 'book-club' }), calendarFixture()])]);
    expect(screen.getByRole('heading', { level: 1, name: 'Edit calendar' })).toBeInTheDocument();
    expect(await screen.findByRole('textbox', { name: 'Name' })).toHaveValue('Run Club');
    expect(document.title).toBe('Edit calendar | Duncit Lite');
  });

  it('says not found for a calendar that is not the reader’s', async () => {
    renderEdit([myCalendars([calendarFixture({ id: 'cal-0', name: 'Book Club', slug: 'book-club' })])]);
    expect(await screen.findByTestId('not-found')).toHaveTextContent('We could not find that');
    expect(screen.queryByTestId('calendar-form')).not.toBeInTheDocument();
  });

  it('shows the API’s reason when the calendars cannot be read', async () => {
    renderEdit([{ request: { query: LITE_MY_CALENDARS }, result: { errors: [{ message: 'Calendars are unavailable' }] } }]);
    expect(await screen.findByTestId('query-guard-error')).toHaveTextContent('Calendars are unavailable');
  });
});
