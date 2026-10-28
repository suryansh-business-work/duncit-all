import { screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LiteEvent } from '../../../../shared/graphql/documents';
import { LITE_PUBLISH_EVENT } from '../../../graphql/events';
import { HostBar } from '../../../pages/event/HostBar';
import { captureNotifications, eventFixture, meFixture, renderWithProviders } from '../../test-utils';

const publishMock = (result: MockedResponse['result']): MockedResponse => ({ request: { query: LITE_PUBLISH_EVENT, variables: { id: 'ev-1' } }, result });

const renderBar = (event: LiteEvent, mocks: MockedResponse[] = []) => {
  const onChanged = vi.fn();
  const utils = renderWithProviders(<HostBar event={event} onChanged={onChanged} />, { me: meFixture(), mocks });
  return { ...utils, onChanged };
};

describe('HostBar', () => {
  let toasts: ReturnType<typeof captureNotifications>;
  beforeEach(() => {
    toasts = captureNotifications();
  });
  afterEach(() => {
    toasts.stop();
  });

  it('flags a draft and offers Manage, Edit and Publish', () => {
    renderBar(eventFixture({ status: 'DRAFT', viewer_is_host: true }));

    const bar = screen.getByTestId('host-bar');
    expect(bar).toHaveClass('MuiAlert-colorWarning');
    expect(bar).toHaveTextContent('This is a draft. Publish it when you are ready for guests.');
    expect(within(bar).getByRole('link', { name: 'Manage event' })).toHaveAttribute('href', '/e/garden-party/manage');
    expect(within(bar).getByRole('link', { name: 'Edit' })).toHaveAttribute('href', '/e/garden-party/edit');
    expect(within(bar).getByRole('button', { name: 'Publish' })).toBeInTheDocument();
  });

  it('tells the host of a published event they are hosting, without a Publish button', () => {
    renderBar(eventFixture({ viewer_is_host: true }));

    const bar = screen.getByTestId('host-bar');
    expect(bar).toHaveClass('MuiAlert-colorInfo');
    expect(bar).toHaveTextContent('You are hosting this event.');
    expect(screen.queryByTestId('host-publish')).not.toBeInTheDocument();
    expect(screen.getByTestId('host-edit')).toBeInTheDocument();
  });

  it('keeps Manage but drops Edit on a cancelled event', () => {
    renderBar(eventFixture({ status: 'CANCELLED', viewer_is_host: true }));

    expect(screen.getByTestId('host-manage')).toBeInTheDocument();
    expect(screen.queryByTestId('host-edit')).not.toBeInTheDocument();
    expect(screen.queryByTestId('host-publish')).not.toBeInTheDocument();
  });

  it('does not publish when the host backs out of the confirmation', async () => {
    const answer = vi.fn(() => ({ data: { litePublishEvent: eventFixture() } }));
    const { user, onChanged } = renderBar(eventFixture({ status: 'DRAFT', viewer_is_host: true }), [publishMock(answer)]);

    await user.click(screen.getByTestId('host-publish'));
    const dialog = await screen.findByTestId('confirm-dialog');
    expect(within(dialog).getByText('Publish this event?')).toBeInTheDocument();
    expect(within(dialog).getByText('It becomes visible according to its visibility setting and guests can register.')).toBeInTheDocument();
    await user.click(within(dialog).getByTestId('confirm-dialog-cancel'));

    await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument());
    expect(answer).not.toHaveBeenCalled();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('publishes on confirmation, announces it and asks the page to re-read', async () => {
    const answer = vi.fn(() => ({ data: { litePublishEvent: eventFixture({ viewer_is_host: true }) } }));
    const { user, onChanged } = renderBar(eventFixture({ status: 'DRAFT', viewer_is_host: true }), [publishMock(answer)]);

    await user.click(screen.getByTestId('host-publish'));
    const confirm = await screen.findByTestId('confirm-dialog-confirm');
    expect(confirm).toHaveTextContent('Publish');
    await user.click(confirm);

    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(answer).toHaveBeenCalledTimes(1);
    expect(toasts.seen).toContainEqual({ message: 'Your event is live.', severity: 'success' });
  });

  it('shows the API refusal and does not report a change', async () => {
    const { user, onChanged } = renderBar(eventFixture({ status: 'DRAFT', viewer_is_host: true }), [publishMock({ errors: [{ message: 'Add a ticket before publishing' }] })]);

    await user.click(screen.getByTestId('host-publish'));
    await user.click(await screen.findByTestId('confirm-dialog-confirm'));

    await waitFor(() => expect(toasts.seen).toContainEqual({ message: 'Add a ticket before publishing', severity: 'error' }));
    expect(onChanged).not.toHaveBeenCalled();
  });
});
