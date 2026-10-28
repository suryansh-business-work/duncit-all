import { screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LITE_SUBMIT_PAYMENT_REFERENCE } from '../../../../graphql/registrations';
import { PaymentReferenceForm } from '../../../../pages/ticket/payment-panel';
import { captureNotifications, meFixture, registrationFixture, renderWithProviders } from '../../../test-utils';

const submitMock = (variables: Record<string, unknown>, result: MockedResponse['result']): MockedResponse => ({
  request: { query: LITE_SUBMIT_PAYMENT_REFERENCE, variables },
  result,
});

const sent = () => ({ data: { liteSubmitPaymentReference: registrationFixture({ status: 'PAYMENT_PENDING', payment_status: 'PENDING', payment_reference: '412345678901' }) } });

const renderForm = (mocks: MockedResponse[] = [], initial = { reference: '', note: '' }) => {
  const onSent = vi.fn();
  const utils = renderWithProviders(
    <PaymentReferenceForm registrationId="reg-1" initialReference={initial.reference} initialNote={initial.note} onSent={onSent} />,
    { me: meFixture(), mocks },
  );
  return { ...utils, onSent };
};

describe('PaymentReferenceForm', () => {
  let toasts: ReturnType<typeof captureNotifications>;
  beforeEach(() => {
    toasts = captureNotifications();
  });
  afterEach(() => {
    toasts.stop();
  });

  it('labels both boxes and explains what goes in them', () => {
    renderForm();

    expect(screen.getByRole('textbox', { name: 'Transaction reference (UTR)' })).toHaveAttribute('maxlength', '40');
    expect(screen.getByText('The 12-digit number in your UPI app after paying')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Note for the host' })).toHaveAttribute('maxlength', '200');
    expect(screen.getByRole('button', { name: 'Send to host' })).toBeInTheDocument();
  });

  it('starts from the reference and note already sent', () => {
    renderForm([], { reference: '412345678901', note: 'From Asha' });

    expect(screen.getByTestId('payment-reference')).toHaveValue('412345678901');
    expect(screen.getByTestId('payment-note')).toHaveValue('From Asha');
  });

  it('refuses a reference that is too short, before asking the API', async () => {
    const answer = vi.fn(sent);
    const { user, onSent } = renderForm([submitMock({ registration_id: 'reg-1', reference: '12345', note: null }, answer)]);

    await user.type(screen.getByTestId('payment-reference'), '12345');
    await user.click(screen.getByTestId('payment-reference-submit'));

    expect(await screen.findByText('A transaction reference is 6 to 40 characters')).toBeInTheDocument();
    expect(screen.getByTestId('payment-reference')).toHaveAttribute('aria-invalid', 'true');
    expect(answer).not.toHaveBeenCalled();
    expect(onSent).not.toHaveBeenCalled();
  });

  it('sends the trimmed reference with no note, confirms it and tells the page', async () => {
    const answer = vi.fn(sent);
    const { user, onSent } = renderForm([submitMock({ registration_id: 'reg-1', reference: '412345678901', note: null }, answer)]);

    await user.type(screen.getByTestId('payment-reference'), '  412345678901 ');
    await user.click(screen.getByTestId('payment-reference-submit'));

    await waitFor(() => expect(onSent).toHaveBeenCalledTimes(1));
    expect(answer).toHaveBeenCalledTimes(1);
    expect(toasts.seen).toContainEqual({ message: 'Sent to the host for confirmation.', severity: 'success' });
  });

  it('sends the note along when the guest wrote one', async () => {
    const answer = vi.fn(sent);
    const { user, onSent } = renderForm([submitMock({ registration_id: 'reg-1', reference: '412345678901', note: 'Paid by Ravi' }, answer)]);

    await user.type(screen.getByTestId('payment-reference'), '412345678901');
    await user.type(screen.getByTestId('payment-note'), 'Paid by Ravi');
    await user.click(screen.getByTestId('payment-reference-submit'));

    await waitFor(() => expect(onSent).toHaveBeenCalledTimes(1));
    expect(answer).toHaveBeenCalledTimes(1);
  });

  it('shows the API refusal and does not report the reference as sent', async () => {
    const { user, onSent } = renderForm([
      submitMock({ registration_id: 'reg-1', reference: '412345678901', note: null }, { errors: [{ message: 'This ticket is already paid for' }] }),
    ]);

    await user.type(screen.getByTestId('payment-reference'), '412345678901');
    await user.click(screen.getByTestId('payment-reference-submit'));

    await waitFor(() => expect(toasts.seen).toContainEqual({ message: 'This ticket is already paid for', severity: 'error' }));
    expect(onSent).not.toHaveBeenCalled();
  });
});
