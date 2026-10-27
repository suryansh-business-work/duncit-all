import type { MockedResponse } from '@apollo/client/testing';
import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LITE_REMOVE_CO_HOST } from '../../../../graphql/manage';
import { CoHostList } from '../../../../pages/manage/settings/CoHostList';
import { captureNotifications, hostFixture, meFixture, renderWithProviders } from '../../../test-utils';
import { apiRefusal, hostedEvent } from '../manage-mocks';

const coHost = hostFixture({ user_id: 'u-9', name: 'Kabir Das', handle: 'kabir', role: 'CO_HOST' });
const event = hostedEvent({ hosts: [hostFixture(), coHost] });

const removeMock = (result: MockedResponse['result']): MockedResponse => ({ request: { query: LITE_REMOVE_CO_HOST, variables: { event_id: 'ev-1', user_id: 'u-9' } }, result });

describe('CoHostList', () => {
  let toasts: ReturnType<typeof captureNotifications>;

  beforeEach(() => {
    toasts = captureNotifications();
  });

  afterEach(() => {
    toasts.stop();
  });

  it('lists every host with their handle; the main host is marked and cannot be removed', () => {
    renderWithProviders(<CoHostList event={event} onChanged={vi.fn()} />);

    const items = within(screen.getByTestId('co-host-list')).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Asha Rao');
    expect(items[0]).toHaveTextContent('@asha');
    expect(within(items[0]).getByText('Host')).toBeInTheDocument();
    expect(within(items[0]).queryByRole('button')).not.toBeInTheDocument();
    expect(within(items[1]).getByRole('button', { name: 'Remove Kabir Das as co-host' })).toBeInTheDocument();
  });

  it('asks first and keeps the co-host when the host backs out', async () => {
    const onChanged = vi.fn();
    const { user } = renderWithProviders(<CoHostList event={event} onChanged={onChanged} />);

    await user.click(screen.getByRole('button', { name: 'Remove Kabir Das as co-host' }));
    const dialog = await screen.findByTestId('confirm-dialog');
    expect(within(dialog).getByText('Kabir Das will no longer be able to manage this event.')).toBeInTheDocument();
    await user.click(within(dialog).getByTestId('confirm-dialog-cancel'));

    await vi.waitFor(() => expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument());
    expect(onChanged).not.toHaveBeenCalled();
    expect(toasts.seen).toEqual([]);
  });

  it('removes the co-host once confirmed', async () => {
    const onChanged = vi.fn();
    const { user } = renderWithProviders(<CoHostList event={event} onChanged={onChanged} />, {
      me: meFixture(),
      mocks: [removeMock({ data: { liteRemoveCoHost: hostedEvent({ hosts: [hostFixture()] }) } })],
    });

    await user.click(screen.getByRole('button', { name: 'Remove Kabir Das as co-host' }));
    await user.click(within(await screen.findByTestId('confirm-dialog')).getByRole('button', { name: 'Remove co-host' }));

    await vi.waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(toasts.seen).toEqual([{ message: 'Co-host removed.', severity: 'success' }]);
  });

  it('shows the refusal when the co-host cannot be removed', async () => {
    const onChanged = vi.fn();
    const { user } = renderWithProviders(<CoHostList event={event} onChanged={onChanged} />, { mocks: [removeMock(apiRefusal('Only the main host can remove co-hosts'))] });

    await user.click(screen.getByRole('button', { name: 'Remove Kabir Das as co-host' }));
    await user.click(within(await screen.findByTestId('confirm-dialog')).getByRole('button', { name: 'Remove co-host' }));

    await vi.waitFor(() => expect(toasts.seen).toEqual([{ message: 'Only the main host can remove co-hosts', severity: 'error' }]));
    expect(onChanged).not.toHaveBeenCalled();
  });
});
