import * as Clipboard from 'expo-clipboard';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { WithdrawalPayoutRefs } from '@/components/wallet/WithdrawalPayoutRefs';
import { fallbackT } from '@/i18n/fallback';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));

const copy = Clipboard.setStringAsync as jest.Mock;

const paymentIdText = (id: string) => fallbackT('withdraw.history.paymentId', { vars: { id } });
const utrText = (utr: string) => fallbackT('withdraw.history.utr', { vars: { utr } });

beforeEach(() => {
  jest.clearAllMocks();
});

describe('WithdrawalPayoutRefs — what it shows', () => {
  it('shows nothing before Razorpay has a payout for the withdrawal', () => {
    renderWithProviders(<WithdrawalPayoutRefs paymentId="" utr="" testID="row" />);
    expect(screen.queryByTestId('row-payment-id')).toBeNull();
    expect(screen.queryByTestId('row-utr')).toBeNull();
  });

  it('shows the payment id alone while the bank has not confirmed the payment', () => {
    renderWithProviders(<WithdrawalPayoutRefs paymentId="pout_Q1" utr="" testID="row" />);
    expect(screen.getByText(paymentIdText('pout_Q1'))).toBeOnTheScreen();
    expect(screen.queryByTestId('row-utr')).toBeNull();
  });

  it('shows the bank reference alone when that is all the payout carries', () => {
    renderWithProviders(<WithdrawalPayoutRefs paymentId={null} utr="UTR77" testID="row" />);
    expect(screen.getByText(utrText('UTR77'))).toBeOnTheScreen();
    expect(screen.queryByTestId('row-payment-id')).toBeNull();
  });

  it('names each copy button for a screen reader', () => {
    renderWithProviders(<WithdrawalPayoutRefs paymentId="pout_Q1" utr="UTR77" testID="row" />);
    expect(screen.getByText(paymentIdText('pout_Q1'))).toBeOnTheScreen();
    expect(screen.getByText(utrText('UTR77'))).toBeOnTheScreen();
    expect(screen.getByLabelText(fallbackT('withdraw.history.copyPaymentId'))).toBeOnTheScreen();
    expect(screen.getByLabelText(fallbackT('withdraw.history.copyUtr'))).toBeOnTheScreen();
  });
});

describe('WithdrawalPayoutRefs — copying', () => {
  it('copies the reference pressed and confirms it on that line only', async () => {
    copy.mockResolvedValue(true);
    renderWithProviders(<WithdrawalPayoutRefs paymentId="pout_Q1" utr="UTR77" testID="row" />);
    fireEvent.press(screen.getByTestId('row-utr-copy'));
    expect(copy).toHaveBeenCalledWith('UTR77');
    await waitFor(() =>
      expect(screen.getByTestId('row-utr-status')).toHaveTextContent(
        fallbackT('withdraw.history.copied'),
      ),
    );
    expect(screen.queryByTestId('row-payment-id-status')).toBeNull();

    fireEvent.press(screen.getByTestId('row-payment-id-copy'));
    expect(copy).toHaveBeenLastCalledWith('pout_Q1');
    await waitFor(() =>
      expect(screen.getByTestId('row-payment-id-status')).toHaveTextContent(
        fallbackT('withdraw.history.copied'),
      ),
    );
  });

  it('says the copy did not land when the clipboard refuses it or throws', async () => {
    copy.mockResolvedValueOnce(false).mockRejectedValueOnce(new Error('no clipboard'));
    renderWithProviders(<WithdrawalPayoutRefs paymentId="pout_Q1" utr="UTR77" testID="row" />);

    fireEvent.press(screen.getByTestId('row-payment-id-copy'));
    await waitFor(() =>
      expect(screen.getByTestId('row-payment-id-status')).toHaveTextContent(
        fallbackT('withdraw.history.copyFailed'),
      ),
    );

    fireEvent.press(screen.getByTestId('row-utr-copy'));
    await waitFor(() =>
      expect(screen.getByTestId('row-utr-status')).toHaveTextContent(
        fallbackT('withdraw.history.copyFailed'),
      ),
    );
  });
});
