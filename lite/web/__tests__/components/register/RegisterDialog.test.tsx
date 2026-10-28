import { screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { describe, expect, it, vi } from 'vitest';
import type { LiteEvent, LiteRegistrationStatus } from '../../../../shared/graphql/documents';
import { RegisterDialog } from '../../../components/register';
import { LITE_REGISTER } from '../../../graphql/registrations';
import { eventFixture, meFixture, registrationFixture, renderWithProviders } from '../../test-utils';

const answeredWith = (status: LiteRegistrationStatus): MockedResponse => ({
  request: { query: LITE_REGISTER, variables: { event_id: 'ev-1', input: { ticket_id: 'tk-1', quantity: 1, answers: [] } } },
  result: { data: { liteRegister: registrationFixture({ status }) } },
});

const renderDialog = (event: LiteEvent, mocks: MockedResponse[] = []) => {
  const onClose = vi.fn();
  const onRegistered = vi.fn();
  const utils = renderWithProviders(<RegisterDialog event={event} open onClose={onClose} onRegistered={onRegistered} />, {
    me: meFixture(),
    mocks,
    route: '/e/garden-party',
  });
  return { ...utils, onClose, onRegistered };
};

describe('RegisterDialog', () => {
  it('is a dialog named "Register" holding the registration form', () => {
    renderDialog(eventFixture());

    const dialog = screen.getByRole('dialog', { name: 'Register' });
    expect(within(dialog).getByTestId('register-form')).toBeInTheDocument();
  });

  it('is named "Request to join" when the host approves guests', () => {
    renderDialog(eventFixture({ require_approval: true }));
    expect(screen.getByRole('dialog', { name: 'Request to join' })).toBeInTheDocument();
  });

  it('closes from its labelled close button', async () => {
    const { user, onClose } = renderDialog(eventFixture());
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it.each<[LiteRegistrationStatus, string]>([
    ['CONFIRMED', 'You are registered for Garden Party.'],
    ['PENDING_APPROVAL', 'Your request for Garden Party is with the host.'],
    ['WAITLISTED', 'The event is full, so you are on the waitlist for Garden Party.'],
  ])('after a %s registration, says what happened and links to the ticket', async (status, sentence) => {
    const { user, onRegistered, onClose } = renderDialog(eventFixture(), [answeredWith(status)]);

    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Register' }));

    const dialog = await screen.findByRole('dialog', { name: 'All done' });
    expect(within(dialog).getByText(sentence)).toBeInTheDocument();
    expect(within(dialog).getByTestId('registration-status-chip')).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'View ticket' })).toHaveAttribute('href', '/tickets/reg-1');
    expect(within(dialog).queryByTestId('register-form')).not.toBeInTheDocument();
    expect(onRegistered).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes from the result with the plain Close button', async () => {
    const { user, onClose } = renderDialog(eventFixture(), [answeredWith('CONFIRMED')]);
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Register' }));
    const dialog = await screen.findByRole('dialog', { name: 'All done' });

    const closeButtons = within(dialog).getAllByRole('button', { name: 'Close' });
    await user.click(closeButtons[closeButtons.length - 1]);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('takes a guest who owes money straight to the ticket, where they pay', async () => {
    const { user, router, onRegistered, onClose } = renderDialog(eventFixture(), [answeredWith('PAYMENT_PENDING')]);

    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Register' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/tickets/reg-1'));
    expect(onRegistered).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
