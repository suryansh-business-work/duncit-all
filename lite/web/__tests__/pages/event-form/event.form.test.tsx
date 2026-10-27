import type { MockedResponse } from '@apollo/client/testing';
import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DuncitLocalizationProvider } from '@duncit/app-settings';
import type { LiteEvent } from '../../../../shared/graphql/documents';
import { LITE_CREATE_EVENT, LITE_UPDATE_EVENT } from '../../../graphql/events';
import { EventForm } from '../../../pages/event-form/event.form';
import { captureNotifications, eventFixture, meFixture, renderWithProviders, type RenderOptions } from '../../test-utils';
import { eventOptionsMocks } from './helpers';

let toasts: ReturnType<typeof captureNotifications>;

beforeEach(() => {
  toasts = captureNotifications();
});

afterEach(() => {
  toasts.stop();
});

function renderForm(event: LiteEvent | null, options: RenderOptions = {}) {
  return renderWithProviders(
    <DuncitLocalizationProvider timeZoneAware>
      <EventForm event={event} />
    </DuncitLocalizationProvider>,
    { me: meFixture(), ...options, mocks: [...eventOptionsMocks(), ...(options.mocks ?? [])] },
  );
}

/** A mutation answer that also records the variables it was asked with. */
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

describe('EventForm — create', () => {
  it('saves a new event as a draft and opens its manage page', async () => {
    const create = recorded(LITE_CREATE_EVENT, { data: { liteCreateEvent: eventFixture({ id: 'ev-9', slug: 'rooftop-jam', title: 'Rooftop Jam', status: 'DRAFT' }) } });
    const { user, router } = renderForm(null, { mocks: [create.mock] });

    await user.type(screen.getByRole('textbox', { name: 'Title' }), 'Rooftop Jam');
    await user.type(screen.getByRole('textbox', { name: 'Venue' }), 'Skyline Terrace');
    await user.type(screen.getByRole('textbox', { name: 'Description' }), 'Live music on the roof.');
    await user.click(screen.getByRole('button', { name: 'Create event' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/e/rooftop-jam/manage'));
    expect(toasts.seen).toContainEqual({ message: 'Draft saved. Publish it when you are ready.', severity: 'success' });
    expect(create.calls.at(-1)).toMatchObject({
      input: {
        title: 'Rooftop Jam',
        description: 'Live music on the roof.',
        location_type: 'IN_PERSON',
        venue_name: 'Skyline Terrace',
        address: null,
        place_id: null,
        lat: null,
        lng: null,
        visibility: 'PUBLIC',
        capacity: null,
        require_approval: false,
        theme: { key: 'MINIMAL', accent: 'DEFAULT' },
        tickets: [{ name: 'General admission', price: 0, quantity: null, is_active: true }],
        questions: [],
      },
    });
  });

  it('offers the host’s saved UPI details on a new event', async () => {
    const { user } = renderForm(null, { me: meFixture({ upi_id: 'asha@okbank', upi_name: 'Asha Rao' }) });
    await user.click(screen.getByRole('button', { name: 'Free, edit tickets and payments' }));
    const dialog = screen.getByRole('dialog', { name: 'Tickets' });
    expect(within(dialog).getByRole('textbox', { name: 'UPI ID' })).toHaveValue('asha@okbank');
    expect(within(dialog).getByRole('textbox', { name: 'Payee name' })).toHaveValue('Asha Rao');
  });

  it('flags the missing fields, and sends nothing, when the form is not ready', async () => {
    const create = recorded(LITE_CREATE_EVENT, { data: { liteCreateEvent: eventFixture() } });
    const { user, router } = renderForm(null, { mocks: [create.mock] });
    await user.click(screen.getByRole('button', { name: 'Create event' }));

    await waitFor(() => expect(toasts.seen).toContainEqual({ message: 'Fix the highlighted fields to continue.', severity: 'error' }));
    expect(screen.getByRole('alert')).toHaveTextContent('This is required');
    expect(screen.getByRole('textbox', { name: 'Venue' })).toHaveAccessibleDescription('Add a venue or an address');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(create.calls).toHaveLength(0);
    expect(router.state.location.pathname).toBe('/');
  });

  it('reopens the tickets editor when a paid ticket has no UPI ID', async () => {
    const { user } = renderForm(null);
    await user.click(screen.getByRole('button', { name: 'Free, edit tickets and payments' }));
    const price = within(screen.getByRole('dialog', { name: 'Tickets' })).getByRole('textbox', { name: 'Price (₹)' });
    await user.clear(price);
    await user.type(price, '100');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: '₹100, edit tickets and payments' })).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: 'Title' }), 'Rooftop Jam');
    await user.type(screen.getByRole('textbox', { name: 'Venue' }), 'Skyline Terrace');
    await user.type(screen.getByRole('textbox', { name: 'Description' }), 'Live music.');
    await user.click(screen.getByRole('button', { name: 'Create event' }));

    const dialog = await screen.findByRole('dialog', { name: 'Tickets' });
    expect(within(dialog).getByText('Add your UPI ID so guests can pay you for a paid ticket')).toBeInTheDocument();
  });

  it('keeps the host on the form and shows the API’s reason when saving fails', async () => {
    const create = recorded(LITE_CREATE_EVENT, { errors: [{ message: 'Hosting is paused for this account' }] });
    const { user, router } = renderForm(null, { mocks: [create.mock] });
    await user.type(screen.getByRole('textbox', { name: 'Title' }), 'Rooftop Jam');
    await user.type(screen.getByRole('textbox', { name: 'Venue' }), 'Skyline Terrace');
    await user.type(screen.getByRole('textbox', { name: 'Description' }), 'Live music.');
    await user.click(screen.getByRole('button', { name: 'Create event' }));

    await waitFor(() => expect(toasts.seen).toContainEqual({ message: 'Hosting is paused for this account', severity: 'error' }));
    expect(router.state.location.pathname).toBe('/');
    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('Rooftop Jam');
  });

  it('previews the chosen theme behind the form', async () => {
    const { user } = renderForm(null);
    expect(screen.getByTestId('event-theme-backdrop')).toHaveAttribute('data-theme-key', 'MINIMAL');
    await user.click(screen.getByRole('button', { name: 'Confetti' }));
    expect(screen.getByTestId('event-theme-backdrop')).toHaveAttribute('data-theme-key', 'CONFETTI');
  });
});

describe('EventForm — edit', () => {
  const event = eventFixture({ viewer_is_host: true });

  it('starts from the event and saves the changes, landing on the event page', async () => {
    const update = recorded(LITE_UPDATE_EVENT, { data: { liteUpdateEvent: eventFixture({ slug: 'garden-party-ii', title: 'Garden Party II' }) } });
    const { user, router } = renderForm(event, { mocks: [update.mock] });

    const title = screen.getByRole('textbox', { name: 'Title' });
    expect(title).toHaveValue('Garden Party');
    expect(screen.getByRole('textbox', { name: 'Venue' })).toHaveValue('Lodhi Garden');
    await user.clear(title);
    await user.type(title, 'Garden Party II');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/e/garden-party-ii'));
    expect(toasts.seen).toContainEqual({ message: 'Event saved.', severity: 'success' });
    expect(update.calls.at(-1)).toMatchObject({
      id: 'ev-1',
      input: { title: 'Garden Party II', start_at: '2026-11-21T13:30:00.000Z', end_at: '2026-11-21T16:00:00.000Z', address: 'Lodhi Road, New Delhi', tickets: [{ id: 'tk-1', price: 0 }] },
    });
  });

  it('does not offer “Create event” when editing', () => {
    renderForm(event);
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'submit');
    expect(screen.queryByRole('button', { name: 'Create event' })).not.toBeInTheDocument();
  });

  it('shows the API’s reason when an edit is refused', async () => {
    const update = recorded(LITE_UPDATE_EVENT, { errors: [{ message: 'Only hosts can edit this event' }] });
    const { user, router } = renderForm(event, { mocks: [update.mock] });
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(toasts.seen).toContainEqual({ message: 'Only hosts can edit this event', severity: 'error' }));
    expect(router.state.location.pathname).toBe('/');
  });
});

