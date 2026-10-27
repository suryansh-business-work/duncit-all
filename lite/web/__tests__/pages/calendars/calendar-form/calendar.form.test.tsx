import type { MockedResponse } from '@apollo/client/testing';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LITE_CREATE_CALENDAR, LITE_UPDATE_CALENDAR } from '../../../../graphql/calendars';
import { LITE_CITIES } from '../../../../graphql/discover';
import { CalendarForm } from '../../../../pages/calendars/calendar-form';
import { TestProviders, calendarFixture, captureNotifications, cityFixture, meFixture, renderWithProviders, seedCache } from '../../../test-utils';

const citiesMock: MockedResponse = { request: { query: LITE_CITIES }, result: { data: { liteCities: [cityFixture()] } }, maxUsageCount: Number.POSITIVE_INFINITY };

/** A mutation answer that records the variables it was asked with. */
function recorded(query: MockedResponse['request']['query'], result: MockedResponse['result']) {
  const calls: Record<string, unknown>[] = [];
  const mock: MockedResponse = {
    request: {
      query,
      variables: (variables: Record<string, unknown>) => {
        calls.push(variables);
        return true;
      },
    },
    result,
  };
  return { mock, calls };
}

let toasts: ReturnType<typeof captureNotifications>;

beforeEach(() => {
  toasts = captureNotifications();
});

afterEach(() => {
  toasts.stop();
});

describe('CalendarForm — new', () => {
  it('creates the calendar and opens its page', async () => {
    const create = recorded(LITE_CREATE_CALENDAR, { data: { liteCreateCalendar: calendarFixture({ slug: 'run-club' }) } });
    const { user, router } = renderWithProviders(<CalendarForm calendar={null} />, { me: meFixture(), mocks: [citiesMock, create.mock] });

    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Run Club');
    await user.type(screen.getByRole('textbox', { name: 'Description' }), 'Saturday 6am runs.');
    await user.click(screen.getByTestId('calendar-city'));
    await user.click(await screen.findByRole('option', { name: 'Delhi' }));
    await user.click(await screen.findByRole('button', { name: 'Save' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/cal/run-club'));
    expect(toasts.seen).toContainEqual({ message: 'Calendar saved.', severity: 'success' });
    expect(create.calls.at(-1)).toEqual({
      input: { name: 'Run Club', slug: null, description: 'Saturday 6am runs.', avatar_url: null, cover_url: null, city_slug: 'delhi' },
    });
  });

  it('offers no city by default, then the cities Lite knows', async () => {
    const { user } = renderWithProviders(<CalendarForm calendar={null} />, { me: meFixture(), mocks: [citiesMock] });
    await user.click(screen.getByTestId('calendar-city'));
    expect(await screen.findByRole('option', { name: 'Delhi' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'No city' })).toHaveAttribute('aria-selected', 'true');
  });

  it('flags a blank name and a bad link, and sends nothing', async () => {
    const create = recorded(LITE_CREATE_CALENDAR, { data: { liteCreateCalendar: calendarFixture() } });
    const { user, router } = renderWithProviders(<CalendarForm calendar={null} />, { me: meFixture(), mocks: [citiesMock, create.mock] });
    await user.type(screen.getByRole('textbox', { name: 'Link' }), 'run club!');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('This is required')).toBeInTheDocument();
    expect(screen.getByText('Use lowercase letters, numbers and hyphens only')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAttribute('aria-invalid', 'true');
    expect(create.calls).toHaveLength(0);
    expect(router.state.location.pathname).toBe('/');
  });

  it('stays on the form and shows the API’s reason when saving fails', async () => {
    const create = recorded(LITE_CREATE_CALENDAR, { errors: [{ message: 'That link is already taken' }] });
    const { user, router } = renderWithProviders(<CalendarForm calendar={null} />, { me: meFixture(), mocks: [citiesMock, create.mock] });
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Run Club');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(toasts.seen).toContainEqual({ message: 'That link is already taken', severity: 'error' }));
    expect(router.state.location.pathname).toBe('/');
  });
});

describe('CalendarForm — edit', () => {
  const calendar = calendarFixture({ description: 'Saturday 6am runs.', city_slug: 'delhi', avatar_url: 'https://cdn.example/rc.png' });

  it('starts from the calendar and saves the changes', async () => {
    const update = recorded(LITE_UPDATE_CALENDAR, { data: { liteUpdateCalendar: calendarFixture({ name: 'Run Club Delhi', slug: 'run-club-delhi' }) } });
    const { user, router } = renderWithProviders(<CalendarForm calendar={calendar} />, { me: meFixture(), mocks: [citiesMock, update.mock] });

    const name = screen.getByRole('textbox', { name: 'Name' });
    expect(name).toHaveValue('Run Club');
    expect(screen.getByRole('textbox', { name: 'Link' })).toHaveValue('run-club');
    expect(screen.getByRole('textbox', { name: 'Description' })).toHaveValue('Saturday 6am runs.');
    expect(screen.getByTestId('calendar-avatar-preview')).toHaveAttribute('src', 'https://cdn.example/rc.png');

    await user.clear(name);
    await user.type(name, 'Run Club Delhi');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/cal/run-club-delhi'));
    expect(update.calls.at(-1)).toEqual({
      id: 'cal-1',
      input: { name: 'Run Club Delhi', slug: 'run-club', description: 'Saturday 6am runs.', avatar_url: 'https://cdn.example/rc.png', cover_url: null, city_slug: 'delhi' },
    });
    expect(toasts.seen).toContainEqual({ message: 'Calendar saved.', severity: 'success' });
  });

  it('goes back where the reader came from on Cancel', async () => {
    const router = createMemoryRouter(
      [
        { path: '/calendars', element: <p>My calendars</p> },
        { path: '/calendars/:id/edit', element: <CalendarForm calendar={calendar} /> },
      ],
      { initialEntries: ['/calendars', '/calendars/cal-1/edit'], initialIndex: 1 },
    );
    const me = meFixture();
    render(
      <TestProviders cache={seedCache({ me })} me={me} mocks={[citiesMock]}>
        <RouterProvider router={router} />
      </TestProviders>,
    );
    await userEvent.setup().click(screen.getByRole('button', { name: 'Cancel' }));
    expect(await screen.findByText('My calendars')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/calendars');
  });
});
