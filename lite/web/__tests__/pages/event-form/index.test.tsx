import type { MockedResponse } from '@apollo/client/testing';
import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DuncitLocalizationProvider } from '@duncit/app-settings';
import type { LiteEvent } from '../../../../shared/graphql/documents';
import { LITE_EVENT } from '../../../graphql/events';
import { CreateEventPage, EditEventPage } from '../../../pages/event-form';
import { eventFixture, meFixture, renderWithProviders } from '../../test-utils';
import { eventOptionsMocks } from './helpers';

const eventMock = (liteEvent: LiteEvent | null): MockedResponse => ({ request: { query: LITE_EVENT, variables: { slug: 'garden-party' } }, result: { data: { liteEvent } } });

describe('CreateEventPage', () => {
  it('asks a signed-out visitor to sign in first', () => {
    renderWithProviders(<CreateEventPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Create event' })).toBeInTheDocument();
    expect(screen.getByTestId('signed-in-gate')).toHaveTextContent('Sign in to create and edit events.');
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByTestId('event-form')).not.toBeInTheDocument();
    expect(document.title).toBe('Create event | Duncit Lite');
  });

  it('shows an empty form to a signed-in host', () => {
    renderWithProviders(
      <DuncitLocalizationProvider timeZoneAware>
        <CreateEventPage />
      </DuncitLocalizationProvider>,
      { me: meFixture(), mocks: eventOptionsMocks() },
    );
    expect(screen.getByTestId('event-form')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Create event' })).toBeInTheDocument();
  });
});

describe('EditEventPage', () => {
  function renderEdit(mocks: MockedResponse[], me = meFixture()) {
    return renderWithProviders(
      <DuncitLocalizationProvider timeZoneAware>
        <EditEventPage />
      </DuncitLocalizationProvider>,
      {
        me,
        mocks: [...eventOptionsMocks(), ...mocks],
        route: '/e/garden-party/edit',
        path: '/e/:slug/edit',
        routes: [{ path: '/e/:slug', element: <p>Event page</p> }],
      },
    );
  }

  it('asks a signed-out visitor to sign in', () => {
    renderWithProviders(<EditEventPage />, { route: '/e/garden-party/edit', path: '/e/:slug/edit' });
    expect(screen.getByRole('heading', { level: 1, name: 'Edit event' })).toBeInTheDocument();
    expect(screen.getByTestId('signed-in-gate')).toHaveTextContent('Sign in to create and edit events.');
  });

  it('loads the event into the form for one of its hosts', async () => {
    renderEdit([eventMock(eventFixture({ viewer_is_host: true }))]);
    expect(await screen.findByTestId('event-form')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('Garden Party');
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(document.title).toBe('Edit event | Duncit Lite');
  });

  it('sends anyone who is not a host back to the event page', async () => {
    const { router } = renderEdit([eventMock(eventFixture({ viewer_is_host: false }))]);
    expect(await screen.findByText('Event page')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/e/garden-party');
    expect(screen.queryByTestId('event-form')).not.toBeInTheDocument();
  });

  it('keeps a cancelled event read-only, even for its host', async () => {
    const { router } = renderEdit([eventMock(eventFixture({ viewer_is_host: true, status: 'CANCELLED', cancelled_at: '2026-11-01T00:00:00.000Z' }))]);
    expect(await screen.findByText('Event page')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/e/garden-party');
  });

  it('says the event does not exist when the API knows no such slug', async () => {
    renderEdit([eventMock(null)]);
    expect(await screen.findByTestId('not-found')).toHaveTextContent('We could not find that');
  });

  it('shows the API’s reason when the event cannot be loaded', async () => {
    renderEdit([{ request: { query: LITE_EVENT, variables: { slug: 'garden-party' } }, result: { errors: [{ message: 'The events service is down' }] } }]);
    await waitFor(() => expect(screen.getByTestId('query-guard-error')).toHaveTextContent('The events service is down'));
    expect(screen.queryByTestId('not-found')).not.toBeInTheDocument();
  });
});
