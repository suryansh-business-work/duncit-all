import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { PaymentClaimSheet } from '@/components/payment-failure/payment-claim/PaymentClaimSheet';
import { submitPaymentClaim } from '@/components/payment-failure/paymentFailureApi';
import { useMe } from '@/hooks/useMe';
import { useSupportUpload } from '@/hooks/useSupportUpload';
import { fallbackT } from '@/i18n/fallback';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/components/payment-failure/paymentFailureApi', () => ({
  submitPaymentClaim: jest.fn(),
  recordPaymentFailure: jest.fn(),
}));
jest.mock('@/hooks/useMe', () => ({ useMe: jest.fn() }));
jest.mock('@/hooks/useSupportUpload', () => ({ useSupportUpload: jest.fn() }));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'req-1' }));

const mockedSubmit = submitPaymentClaim as jest.Mock;
const mockedMe = useMe as jest.Mock;
const mockedUpload = useSupportUpload as jest.Mock;
const pickAndUpload = jest.fn();

const me = { email: 'riya@duncit.com', phone_extension: '+91', phone_number: '9845012345' };

const renderSheet = () => {
  const onClose = jest.fn();
  renderWithProviders(<PaymentClaimSheet paymentDocId="doc9" onClose={onClose} />);
  return { onClose };
};

const pickOption = (type: string) =>
  fireEvent.press(screen.getByTestId(`payment-claim-option-${type}`));
const submit = () => fireEvent.press(screen.getByTestId('payment-claim-submit'));
const typeReference = (value: string) => {
  pickOption('TRANSACTION_ID');
  fireEvent.changeText(screen.getByTestId('field-transaction_id'), value);
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedMe.mockReturnValue({ data: { me }, isLoading: false, error: null });
  mockedUpload.mockReturnValue({ uploading: false, error: '', pickAndUpload });
  mockedSubmit.mockResolvedValue({ case_id: 'case1', ticket_no: 'ST-77', already_open: false });
});

describe('PaymentClaimSheet — contact', () => {
  it('shows the account’s registered phone and email support will use', () => {
    renderSheet();
    expect(screen.getByText(fallbackT('mweb.payment.claim.contactNotice'))).toBeOnTheScreen();
    expect(screen.getByTestId('payment-claim-phone')).toHaveTextContent(/\+91 9845012345/);
    expect(screen.getByTestId('payment-claim-email')).toHaveTextContent(/riya@duncit\.com/);
  });

  it('says plainly when the account has no phone or email', () => {
    mockedMe.mockReturnValue({ data: null, isLoading: false, error: null });
    renderSheet();
    expect(screen.getByTestId('payment-claim-phone')).toHaveTextContent(
      new RegExp(fallbackT('mweb.payment.claim.missingContact')),
    );
  });
});

describe('PaymentClaimSheet — uploaded evidence', () => {
  it('opens on the screenshot option, picking only images into the private evidence folder', () => {
    renderSheet();
    expect(screen.getByTestId('payment-claim-option-SCREENSHOT')).toHaveProp('aria-checked', true);
    const [folder, filter] = mockedUpload.mock.calls[0];
    expect(folder).toBe('payment-evidence');
    expect(filter.types).toEqual(['image/*']);
    expect(filter.accepts('image/png')).toBe(true);
    expect(filter.accepts('application/pdf')).toBe(false);
    expect(filter.refusal).toBe(fallbackT('mweb.payment.claim.wrongFileType'));
  });

  it('asks for a file and sends nothing when none is attached', async () => {
    renderSheet();
    submit();
    expect(await screen.findByTestId('payment-claim-files-error')).toHaveTextContent(
      fallbackT('mweb.payment.claim.filesRequired'),
    );
    expect(mockedSubmit).not.toHaveBeenCalled();
  });

  it('files the uploaded screenshot and quotes the ticket opened', async () => {
    pickAndUpload.mockResolvedValue('https://ik/payment-evidence/shot.png');
    renderSheet();
    fireEvent.press(screen.getByTestId('ticket-attach-add'));
    await waitFor(() => expect(screen.getByTestId('ticket-attach-0')).toBeOnTheScreen());
    submit();
    await waitFor(() => expect(mockedSubmit).toHaveBeenCalledTimes(1));
    expect(mockedSubmit).toHaveBeenCalledWith({
      payment_doc_id: 'doc9',
      evidence_type: 'SCREENSHOT',
      file_refs: ['https://ik/payment-evidence/shot.png'],
      transaction_id: null,
      client_request_id: 'req-1',
    });
    expect(await screen.findByTestId('payment-claim-success')).toHaveTextContent(
      fallbackT('mweb.payment.claim.success', { vars: { ticket: 'ST-77' } }),
    );
  });

  it('takes images or a PDF for a bank statement', () => {
    renderSheet();
    pickOption('BANK_STATEMENT');
    const [, filter] = mockedUpload.mock.calls[mockedUpload.mock.calls.length - 1];
    expect(filter.types).toEqual(['image/*', 'application/pdf']);
    expect(filter.accepts('application/pdf')).toBe(true);
    expect(filter.accepts('application/msword')).toBe(false);
  });
});

describe('PaymentClaimSheet — transaction id', () => {
  it('refuses a malformed reference with the shared message', async () => {
    renderSheet();
    typeReference('UTR: 12');
    submit();
    expect(
      await screen.findByText(fallbackT('mweb.payment.claim.transactionIdInvalid')),
    ).toBeOnTheScreen();
    expect(mockedSubmit).not.toHaveBeenCalled();
  });

  it('says the ticket already open for this payment is the one to follow', async () => {
    mockedSubmit.mockResolvedValue({ case_id: 'case1', ticket_no: 'ST-77', already_open: true });
    const { onClose } = renderSheet();
    typeReference(' pay_29QQoUBi66xm2f ');
    submit();
    expect(await screen.findByTestId('payment-claim-success')).toHaveTextContent(
      fallbackT('mweb.payment.claim.alreadyOpen', { vars: { ticket: 'ST-77' } }),
    );
    expect(mockedSubmit.mock.calls[0][0]).toMatchObject({
      evidence_type: 'TRANSACTION_ID',
      transaction_id: 'pay_29QQoUBi66xm2f',
      file_refs: null,
    });
    fireEvent.press(screen.getByTestId('payment-claim-done'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('PaymentClaimSheet — failures', () => {
  it('keeps the form and resends with the same request id after a failed call', async () => {
    mockedSubmit.mockRejectedValueOnce(new Error('Network request failed'));
    renderSheet();
    typeReference('pay_29QQoUBi66xm2f');
    submit();
    expect(await screen.findByTestId('payment-claim-error')).toHaveTextContent(
      fallbackT('mweb.payment.claim.error'),
    );
    submit();
    expect(await screen.findByTestId('payment-claim-success')).toBeOnTheScreen();
    expect(mockedSubmit.mock.calls[1][0].client_request_id).toBe(
      mockedSubmit.mock.calls[0][0].client_request_id,
    );
  });

  it('says a refusal the buyer can fix in the server’s own words', async () => {
    mockedSubmit.mockRejectedValueOnce(
      Object.assign(new Error('That transaction ID does not belong to this payment.'), {
        extensions: { code: 'BAD_USER_INPUT' },
      }),
    );
    renderSheet();
    typeReference('pay_29QQoUBi66xm2f');
    submit();
    expect(await screen.findByTestId('payment-claim-error')).toHaveTextContent(
      'That transaction ID does not belong to this payment.',
    );
  });

  it('treats an answer with no ticket number as a failure', async () => {
    mockedSubmit.mockResolvedValue(null);
    renderSheet();
    typeReference('pay_29QQoUBi66xm2f');
    submit();
    expect(await screen.findByTestId('payment-claim-error')).toHaveTextContent(
      fallbackT('mweb.payment.claim.error'),
    );
  });

  it('closes from Cancel without filing anything', () => {
    const { onClose } = renderSheet();
    fireEvent.press(screen.getByTestId('payment-claim-cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockedSubmit).not.toHaveBeenCalled();
  });
});
