import { screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LiteRegistration } from '../../../../shared/graphql/documents';
import { LITE_CANCEL_REGISTRATION } from '../../../graphql/registrations';
import { ViewerStatus } from '../../../pages/event/ViewerStatus';
import { captureNotifications, meFixture, registrationFixture, renderWithProviders } from '../../test-utils';

type View = 'CONFIRMED' | 'PAYMENT_PENDING' | 'PENDING_APPROVAL' | 'WAITLISTED';

const cancelMock = (result: MockedResponse['result']): MockedResponse => ({
  request: { query: LITE_CANCEL_REGISTRATION, variables: { id: 'reg-1' } },
  result,
});

const renderStatus = (view: View, registration: LiteRegistration, mocks: MockedResponse[] = []) => {
  const onChanged = vi.fn();
  const utils = renderWithProviders(<ViewerStatus view={view} registration={registration} onChanged={onChanged} />, { me: meFixture(), mocks });
  return { ...utils, onChanged };
};

describe('ViewerStatus', () => {
  let toasts: ReturnType<typeof captureNotifications>;
  beforeEach(() => {
    toasts = captureNotifications();
  });
  afterEach(() => {
    toasts.stop();
  });

  it.each<[View, string]>([
    ['CONFIRMED', 'You are in. See you there!'],
    ['PENDING_APPROVAL', 'The host will review your request.'],
    ['WAITLISTED', 'You are on the waitlist. We will tell you when a spot opens.'],
  ])('tells a %s guest where they stand and links to their ticket', (view, sentence) => {
    renderStatus(view, registrationFixture({ status: view }));

    expect(screen.getByText(sentence)).toBeInTheDocument();
    expect(screen.getByTestId('registration-status-chip')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'View your ticket' });
    expect(link).toHaveAttribute('href', '/tickets/reg-1');
  });

  it('asks a guest whose payment is pending to complete it', () => {
    renderStatus('PAYMENT_PENDING', registrationFixture({ status: 'PAYMENT_PENDING' }));

    expect(screen.getByText('Your seat is held until the host confirms your payment.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Complete payment' })).toHaveAttribute('href', '/tickets/reg-1');
    expect(screen.getByTestId('registration-status-chip')).toHaveTextContent('Payment pending');
  });

  it('shows the waitlist position only when there is one', () => {
    const { unmount } = renderStatus('WAITLISTED', registrationFixture({ status: 'WAITLISTED', waitlist_position: 4 }));
    expect(screen.getByText('Position 4')).toBeInTheDocument();
    unmount();

    renderStatus('CONFIRMED', registrationFixture({ status: 'CONFIRMED', waitlist_position: null }));
    expect(screen.queryByText(/^Position/)).not.toBeInTheDocument();
  });

  it('keeps the place when the guest backs out of the confirmation', async () => {
    const answer = vi.fn(() => ({ data: { liteCancelRegistration: registrationFixture({ status: 'CANCELLED' }) } }));
    const { user, onChanged } = renderStatus('CONFIRMED', registrationFixture(), [cancelMock(answer)]);

    await user.click(screen.getByTestId('viewer-cancel'));
    const dialog = await screen.findByTestId('confirm-dialog');
    expect(within(dialog).getByText('Cancel your registration?')).toBeInTheDocument();
    expect(within(dialog).getByTestId('confirm-dialog-cancel')).toHaveTextContent('Keep it');
    await user.click(within(dialog).getByTestId('confirm-dialog-cancel'));

    await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument());
    expect(answer).not.toHaveBeenCalled();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('cancels the registration once confirmed, says so, and asks the page to re-read', async () => {
    const answer = vi.fn(() => ({ data: { liteCancelRegistration: registrationFixture({ status: 'CANCELLED' }) } }));
    const { user, onChanged } = renderStatus('CONFIRMED', registrationFixture(), [cancelMock(answer)]);

    await user.click(screen.getByTestId('viewer-cancel'));
    await user.click(await screen.findByTestId('confirm-dialog-confirm'));

    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(answer).toHaveBeenCalledTimes(1);
    expect(toasts.seen).toContainEqual({ message: 'Your registration was cancelled.', severity: 'success' });
  });

  it('reports the API refusal and leaves the page alone', async () => {
    const refusal = { errors: [{ message: 'This registration can no longer be cancelled' }] };
    const { user, onChanged } = renderStatus('CONFIRMED', registrationFixture(), [cancelMock(refusal)]);

    await user.click(screen.getByTestId('viewer-cancel'));
    await user.click(await screen.findByTestId('confirm-dialog-confirm'));

    await waitFor(() => expect(toasts.seen).toContainEqual({ message: 'This registration can no longer be cancelled', severity: 'error' }));
    expect(onChanged).not.toHaveBeenCalled();
  });
});
