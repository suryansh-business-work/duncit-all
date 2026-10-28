import { screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LiteRegistrationStatus } from '../../../../shared/graphql/documents';
import { LITE_CANCEL_REGISTRATION, type LiteTicket } from '../../../graphql/registrations';
import { TicketDetails } from '../../../pages/ticket/TicketDetails';
import { captureNotifications, meFixture, registrationFixture, renderWithProviders } from '../../test-utils';
import { myTicketFixture, ticketEventFixture } from './ticket-fixture';

const renderDetails = (ticket: LiteTicket, mocks: MockedResponse[] = []) => {
  const onChanged = vi.fn();
  const utils = renderWithProviders(<TicketDetails ticket={ticket} onChanged={onChanged} />, { me: meFixture(), mocks });
  return { ...utils, onChanged };
};

const cancelMock = (result: MockedResponse['result']): MockedResponse => ({ request: { query: LITE_CANCEL_REGISTRATION, variables: { id: 'reg-1' } }, result });

describe('TicketDetails', () => {
  let toasts: ReturnType<typeof captureNotifications>;
  beforeEach(() => {
    toasts = captureNotifications();
  });
  afterEach(() => {
    toasts.stop();
  });

  it('shows the status, and hides the payment chip for a free ticket', () => {
    renderDetails(myTicketFixture());

    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByTestId('registration-status-chip')).toHaveTextContent('Going');
    expect(screen.queryByTestId('payment-status-chip')).not.toBeInTheDocument();
    expect(screen.getByTestId('status-timeline')).toBeInTheDocument();
  });

  it('shows where a paid ticket’s payment stands', () => {
    renderDetails(myTicketFixture({ status: 'PAYMENT_PENDING', amount_due: 500, payment_status: 'PENDING' }));
    expect(screen.getByTestId('payment-status-chip')).toHaveTextContent('Awaiting payment');
  });

  it('lists the ticket, the quantity and the answers given, with a dash for a blank answer', () => {
    renderDetails(
      myTicketFixture({
        quantity: 3,
        answers: [
          { question_id: 'q-1', label: 'Dietary needs', answer: 'Vegan' },
          { question_id: 'q-2', label: 'Anything else?', answer: '' },
        ],
      }),
    );

    expect(screen.getByText('Your registration')).toBeInTheDocument();
    expect(screen.getByText('Ticket')).toBeInTheDocument();
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('How many')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Your answers')).toBeInTheDocument();
    expect(screen.getByText('Vegan')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('leaves the answers section out when the host asked nothing', () => {
    renderDetails(myTicketFixture({ answers: [] }));
    expect(screen.queryByText('Your answers')).not.toBeInTheDocument();
  });

  it('gives a confirmed guest of an online event the join link', () => {
    renderDetails(myTicketFixture({ event: ticketEventFixture({ location_type: 'VIRTUAL', virtual_link: 'https://meet.example/garden' }) }));

    const join = screen.getByRole('link', { name: 'Open the join link' });
    expect(join).toHaveAttribute('href', 'https://meet.example/garden');
    expect(join).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it.each([
    ['not yet confirmed', myTicketFixture({ status: 'PENDING_APPROVAL', event: ticketEventFixture({ location_type: 'VIRTUAL', virtual_link: 'https://meet.example/garden' }) })],
    ['in person', myTicketFixture({ event: ticketEventFixture({ location_type: 'IN_PERSON', virtual_link: 'https://meet.example/garden' }) })],
    ['without a link yet', myTicketFixture({ event: ticketEventFixture({ location_type: 'VIRTUAL', virtual_link: null }) })],
  ])('has no join link when the ticket is %s', (_case, ticket) => {
    renderDetails(ticket);
    expect(screen.queryByTestId('ticket-join-link')).not.toBeInTheDocument();
  });

  it.each<LiteRegistrationStatus>(['PENDING_APPROVAL', 'PAYMENT_PENDING', 'CONFIRMED', 'WAITLISTED'])('lets a %s guest cancel', (status) => {
    renderDetails(myTicketFixture({ status }));
    expect(screen.getByRole('button', { name: 'Cancel registration' })).toBeInTheDocument();
  });

  it.each<LiteRegistrationStatus>(['DECLINED', 'CANCELLED'])('offers no cancel button once the registration is %s', (status) => {
    renderDetails(myTicketFixture({ status }));
    expect(screen.queryByTestId('ticket-cancel')).not.toBeInTheDocument();
  });

  it('keeps the registration when the guest backs out', async () => {
    const answer = vi.fn(() => ({ data: { liteCancelRegistration: registrationFixture({ status: 'CANCELLED' }) } }));
    const { user, onChanged } = renderDetails(myTicketFixture(), [cancelMock(answer)]);

    await user.click(screen.getByTestId('ticket-cancel'));
    const dialog = await screen.findByTestId('confirm-dialog');
    expect(within(dialog).getByText('Your place is released to the next person. You can register again while spots remain.')).toBeInTheDocument();
    await user.click(within(dialog).getByTestId('confirm-dialog-cancel'));

    await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument());
    expect(answer).not.toHaveBeenCalled();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('cancels on confirmation, says so and re-reads the ticket', async () => {
    const answer = vi.fn(() => ({ data: { liteCancelRegistration: registrationFixture({ status: 'CANCELLED' }) } }));
    const { user, onChanged } = renderDetails(myTicketFixture(), [cancelMock(answer)]);

    await user.click(screen.getByTestId('ticket-cancel'));
    await user.click(await screen.findByTestId('confirm-dialog-confirm'));

    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(answer).toHaveBeenCalledTimes(1);
    expect(toasts.seen).toContainEqual({ message: 'Your registration was cancelled.', severity: 'success' });
  });

  it('shows why a cancellation was refused', async () => {
    const { user, onChanged } = renderDetails(myTicketFixture(), [cancelMock({ errors: [{ message: 'The event has already started' }] })]);

    await user.click(screen.getByTestId('ticket-cancel'));
    await user.click(await screen.findByTestId('confirm-dialog-confirm'));

    await waitFor(() => expect(toasts.seen).toContainEqual({ message: 'The event has already started', severity: 'error' }));
    expect(onChanged).not.toHaveBeenCalled();
  });
});
