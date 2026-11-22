import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fallbackT } from '../../../i18n/fallback';
import PaymentClaimDialog from '../PaymentClaimDialog';
import { SUBMIT_PAYMENT_DEDUCTION_CLAIM } from '../queries';

const h = vi.hoisted(() => ({
  user: { email: 'riya@duncit.com', phone_extension: '+91', phone_number: '9845012345' } as Record<string, string | null> | null,
}));
vi.mock('@duncit/user-context', () => ({ useUserData: () => ({ user: h.user }) }));
// The default screenshot option renders support's upload field; this suite
// files by transaction id, so the field only has to be there.
vi.mock('../../../forms/support-form/AttachmentsField', () => ({ default: () => <div data-testid="attachments-stub" /> }));

const REQUEST_ID = '00000000-0000-4000-8000-00000000c1a1';
const input = {
  payment_doc_id: 'doc9',
  evidence_type: 'TRANSACTION_ID',
  file_refs: null,
  transaction_id: 'pay_29QQoUBi66xm2f',
  client_request_id: REQUEST_ID,
};
const request = { query: SUBMIT_PAYMENT_DEDUCTION_CLAIM, variables: { input } };
const answered = (already_open: boolean): MockedResponse => ({
  request,
  result: { data: { submitPaymentDeductionClaim: { __typename: 'PaymentDeductionClaimResult', case_id: 'case1', ticket_no: 'ST-77', already_open } } },
});

const renderDialog = (mocks: MockedResponse[]) => {
  const onClose = vi.fn();
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <PaymentClaimDialog paymentDocId="doc9" onClose={onClose} />
    </MockedProvider>,
  );
  return { onClose };
};

const fileByReference = () => {
  fireEvent.click(screen.getByRole('radio', { name: fallbackT('mweb.payment.claim.optionTransactionId') }));
  fireEvent.change(screen.getByTestId('field-transaction_id'), { target: { value: 'pay_29QQoUBi66xm2f' } });
  fireEvent.click(screen.getByTestId('payment-claim-submit'));
};

beforeEach(() => {
  h.user = { email: 'riya@duncit.com', phone_extension: '+91', phone_number: '9845012345' };
  vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(REQUEST_ID);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PaymentClaimDialog', () => {
  it('shows the account’s registered phone and email in the footer', () => {
    renderDialog([]);
    expect(screen.getByText(fallbackT('mweb.payment.claim.title'))).toBeInTheDocument();
    expect(screen.getByTestId('payment-claim-phone')).toHaveTextContent('+91 9845012345');
    expect(screen.getByTestId('payment-claim-email')).toHaveTextContent('riya@duncit.com');
  });

  it('copes with a signed-in user whose contact has not loaded', () => {
    h.user = null;
    renderDialog([]);
    expect(screen.getByTestId('payment-claim-phone')).toHaveTextContent(fallbackT('mweb.payment.claim.missingContact'));
  });

  it('opens a ticket and quotes its number', async () => {
    renderDialog([answered(false)]);
    fileByReference();
    expect(await screen.findByTestId('payment-claim-success')).toHaveTextContent(
      fallbackT('mweb.payment.claim.success', { vars: { ticket: 'ST-77' } }),
    );
    expect(screen.queryByTestId('payment-claim-form')).not.toBeInTheDocument();
  });

  it('says the ticket already open for this payment is the one to follow', async () => {
    const { onClose } = renderDialog([answered(true)]);
    fileByReference();
    expect(await screen.findByTestId('payment-claim-success')).toHaveTextContent(
      fallbackT('mweb.payment.claim.alreadyOpen', { vars: { ticket: 'ST-77' } }),
    );
    fireEvent.click(screen.getByTestId('payment-claim-done'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps the form and offers a resend with the same request id when the call fails', async () => {
    renderDialog([{ request, error: new Error('Failed to fetch') }, answered(false)]);
    fileByReference();
    expect(await screen.findByTestId('payment-claim-error')).toHaveTextContent(fallbackT('mweb.payment.claim.error'));
    // The resend matches the second mock only because the request id is unchanged.
    fireEvent.click(screen.getByTestId('payment-claim-submit'));
    expect(await screen.findByTestId('payment-claim-success')).toBeInTheDocument();
  });

  it('says a refusal the buyer can fix in the server’s own words', async () => {
    const refusal = Object.assign(new Error('refused'), {
      graphQLErrors: [{ message: 'That transaction ID does not belong to this payment.', extensions: { code: 'BAD_USER_INPUT' } }],
    });
    renderDialog([{ request, error: refusal }]);
    fileByReference();
    expect(await screen.findByTestId('payment-claim-error')).toHaveTextContent('That transaction ID does not belong to this payment.');
  });

  it('treats an answer with no ticket number as a failure', async () => {
    renderDialog([{ request, result: { data: { submitPaymentDeductionClaim: null } } }]);
    fileByReference();
    await waitFor(() => expect(screen.getByTestId('payment-claim-error')).toHaveTextContent(fallbackT('mweb.payment.claim.error')));
  });

  it('closes from Cancel without filing anything', () => {
    const { onClose } = renderDialog([]);
    fireEvent.click(screen.getByTestId('payment-claim-cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
