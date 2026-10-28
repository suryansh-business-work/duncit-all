import type { MockedResponse } from '@apollo/client/testing';
import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LiteEvent } from '../../../../shared/graphql/documents';
import { LITE_DUPLICATE_EVENT, LITE_PUBLISH_EVENT } from '../../../graphql/events';
import { OverviewTab } from '../../../pages/manage/OverviewTab';
import { captureNotifications, renderWithProviders, statsFixture } from '../../test-utils';
import { apiRefusal, hostedEvent } from './manage-mocks';

const publishMock = (result: MockedResponse['result']): MockedResponse => ({ request: { query: LITE_PUBLISH_EVENT, variables: { id: 'ev-1' } }, result });
const duplicateMock = (result: MockedResponse['result']): MockedResponse => ({ request: { query: LITE_DUPLICATE_EVENT, variables: { id: 'ev-1' } }, result });

const renderTab = (event: LiteEvent, mocks: MockedResponse[] = [], handlers = { onChanged: vi.fn(), onOpenTab: vi.fn() }) => ({
  ...renderWithProviders(<OverviewTab event={event} onChanged={handlers.onChanged} onOpenTab={handlers.onOpenTab} />, {
    mocks,
    path: '/e/:slug/manage',
    route: '/e/garden-party/manage',
    routes: [{ path: '/e/:slug/edit', element: <p>editor</p> }],
  }),
  ...handlers,
});

describe('OverviewTab', () => {
  let toasts: ReturnType<typeof captureNotifications>;

  beforeEach(() => {
    toasts = captureNotifications();
  });

  afterEach(() => {
    toasts.stop();
  });

  it('shows each count and the confirmed revenue in rupees', () => {
    const event = hostedEvent({ stats: statsFixture({ going: 12, pending: 2, payment_pending: 1, waitlisted: 4, checked_in: 7, revenue_confirmed: 12_500 }) });
    renderTab(event);

    const tiles: [string, string, string][] = [
      ['stat-going', 'Going', '12'],
      ['stat-pending', 'Pending approval', '2'],
      ['stat-payment_pending', 'Payment pending', '1'],
      ['stat-waitlisted', 'Waitlisted', '4'],
      ['stat-checked_in', 'Checked in', '7'],
      ['stat-revenue', 'Revenue confirmed', '₹12,500'],
    ];
    for (const [testId, label, value] of tiles) {
      const tile = screen.getByTestId(testId);
      expect(within(tile).getByText(label)).toBeInTheDocument();
      expect(within(tile).getByText(value)).toBeInTheDocument();
    }
  });

  it('links to the page, the editor and the scanner, and opens the guests tab', async () => {
    const { user, onOpenTab } = renderTab(hostedEvent());

    expect(screen.getByRole('link', { name: 'View event page' })).toHaveAttribute('href', '/e/garden-party');
    expect(screen.getByRole('link', { name: 'Edit event' })).toHaveAttribute('href', '/e/garden-party/edit');
    expect(screen.getByRole('link', { name: 'Open scanner' })).toHaveAttribute('href', '/e/garden-party/scan');

    await user.click(screen.getByRole('button', { name: 'Guests' }));

    expect(onOpenTab).toHaveBeenCalledWith('guests');
  });

  it('only offers Publish on a draft', () => {
    renderTab(hostedEvent());

    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
  });

  it('asks before publishing and leaves a draft alone when the host backs out', async () => {
    const { user, onChanged } = renderTab(hostedEvent({ status: 'DRAFT' }));

    await user.click(screen.getByRole('button', { name: 'Publish' }));
    const dialog = await screen.findByTestId('confirm-dialog');
    expect(within(dialog).getByText('Publish this event?')).toBeInTheDocument();
    await user.click(within(dialog).getByTestId('confirm-dialog-cancel'));

    await vi.waitFor(() => expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument());
    expect(onChanged).not.toHaveBeenCalled();
    expect(toasts.seen).toEqual([]);
  });

  it('publishes a draft once confirmed', async () => {
    const { user, onChanged } = renderTab(hostedEvent({ status: 'DRAFT' }), [publishMock({ data: { litePublishEvent: hostedEvent() } })]);

    await user.click(screen.getByRole('button', { name: 'Publish' }));
    await user.click(within(await screen.findByTestId('confirm-dialog')).getByRole('button', { name: 'Publish' }));

    await vi.waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(toasts.seen).toEqual([{ message: 'Your event is live.', severity: 'success' }]);
  });

  it('shows why a draft could not be published', async () => {
    const { user, onChanged } = renderTab(hostedEvent({ status: 'DRAFT' }), [publishMock(apiRefusal('Add a ticket before publishing'))]);

    await user.click(screen.getByRole('button', { name: 'Publish' }));
    await user.click(within(await screen.findByTestId('confirm-dialog')).getByRole('button', { name: 'Publish' }));

    await vi.waitFor(() => expect(toasts.seen).toEqual([{ message: 'Add a ticket before publishing', severity: 'error' }]));
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('duplicates the event into a new draft and opens it in the editor', async () => {
    const copy = hostedEvent({ id: 'ev-2', slug: 'garden-party-copy', status: 'DRAFT' });
    const { user, router } = renderTab(hostedEvent(), [duplicateMock({ data: { liteDuplicateEvent: copy } })]);

    await user.click(screen.getByRole('button', { name: 'Duplicate' }));
    const dialog = await screen.findByTestId('confirm-dialog');
    expect(within(dialog).getByText('A new draft is created with the same details and no guests.')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Duplicate' }));

    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/e/garden-party-copy/edit'));
    expect(toasts.seen).toEqual([{ message: 'Draft copied. Edit the dates before publishing.', severity: 'success' }]);
  });

  it('does not duplicate when the host backs out', async () => {
    const { user, router } = renderTab(hostedEvent());

    await user.click(screen.getByRole('button', { name: 'Duplicate' }));
    await user.click(within(await screen.findByTestId('confirm-dialog')).getByTestId('confirm-dialog-cancel'));

    await vi.waitFor(() => expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument());
    expect(router.state.location.pathname).toBe('/e/garden-party/manage');
    expect(toasts.seen).toEqual([]);
  });

  it('stays on the console and shows the refusal when duplicating fails', async () => {
    const { user, router } = renderTab(hostedEvent(), [duplicateMock(apiRefusal('Too many drafts'))]);

    await user.click(screen.getByRole('button', { name: 'Duplicate' }));
    await user.click(within(await screen.findByTestId('confirm-dialog')).getByRole('button', { name: 'Duplicate' }));

    await vi.waitFor(() => expect(toasts.seen).toEqual([{ message: 'Too many drafts', severity: 'error' }]));
    expect(router.state.location.pathname).toBe('/e/garden-party/manage');
  });

  it('opens the cancel dialog for a live event', async () => {
    const { user } = renderTab(hostedEvent());

    await user.click(screen.getByRole('button', { name: 'Cancel event' }));

    expect(await screen.findByRole('dialog', { name: 'Cancel event' })).toBeInTheDocument();
  });

  it('drops edit and cancel once the event is cancelled, but still allows a duplicate', () => {
    renderTab(hostedEvent({ status: 'CANCELLED' }));

    expect(screen.queryByRole('link', { name: 'Edit event' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel event' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Duplicate' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View event page' })).toBeInTheDocument();
  });
});
