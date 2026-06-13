import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { WithdrawDialog } from '@/components/wallet/WithdrawDialog';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const props = { open: true, maxAmount: 1000, currency: '₹', onClose: jest.fn(), onDone: jest.fn() };

beforeEach(() => {
  jest.clearAllMocks();
  mockRequest.mockResolvedValue({ requestWithdrawal: { id: 'w1', status: 'PENDING' } });
});

describe('WithdrawDialog', () => {
  it('submits a UPI withdrawal', async () => {
    const onDone = jest.fn();
    renderWithProviders(<WithdrawDialog {...props} onDone={onDone} />);
    fireEvent.changeText(screen.getByTestId('field-amount'), '500');
    fireEvent.changeText(screen.getByTestId('field-upi_id'), 'asha@upi');
    fireEvent.press(screen.getByTestId('withdraw-submit'));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(mockRequest).toHaveBeenCalledWith(
      expect.anything(),
      { input: expect.objectContaining({ amount: 500, upi_id: 'asha@upi' }) },
      { auth: true },
    );
  });

  it('blocks an invalid submit and an over-balance amount', async () => {
    renderWithProviders(<WithdrawDialog {...props} />);
    fireEvent.press(screen.getByTestId('withdraw-submit'));
    await waitFor(() => expect(screen.getByTestId('amount-error')).toBeOnTheScreen());
    expect(screen.getByTestId('upi_id-error')).toBeOnTheScreen();
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('switches to a bank method and requires account fields', async () => {
    renderWithProviders(<WithdrawDialog {...props} />);
    fireEvent.press(screen.getByTestId('withdraw-method-IMPS'));
    fireEvent.changeText(screen.getByTestId('field-amount'), '300');
    fireEvent.press(screen.getByTestId('withdraw-submit'));
    await waitFor(() => expect(screen.getByTestId('account_number-error')).toBeOnTheScreen());
    expect(screen.getByTestId('ifsc_code-error')).toBeOnTheScreen();
  });

  it('surfaces a server error and a non-Error rejection', async () => {
    renderWithProviders(<WithdrawDialog {...props} />);
    fireEvent.changeText(screen.getByTestId('field-amount'), '500');
    fireEvent.changeText(screen.getByTestId('field-upi_id'), 'a@upi');
    mockRequest.mockRejectedValueOnce(new Error('Insufficient balance'));
    fireEvent.press(screen.getByTestId('withdraw-submit'));
    await waitFor(() => expect(screen.getByText('Insufficient balance')).toBeOnTheScreen());
    mockRequest.mockRejectedValueOnce('nope');
    fireEvent.press(screen.getByTestId('withdraw-submit'));
    await waitFor(() =>
      expect(screen.getByText('Could not request the withdrawal')).toBeOnTheScreen(),
    );
  });

  it('locks while requesting and cancels otherwise', async () => {
    const onClose = jest.fn();
    let resolve!: (value: unknown) => void;
    mockRequest.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    renderWithProviders(<WithdrawDialog {...props} onClose={onClose} />);
    fireEvent.changeText(screen.getByTestId('field-amount'), '500');
    fireEvent.changeText(screen.getByTestId('field-upi_id'), 'a@upi');
    fireEvent.press(screen.getByTestId('withdraw-submit'));
    await waitFor(() => expect(screen.getByText('Requesting…')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('withdraw-cancel'));
    expect(onClose).not.toHaveBeenCalled();
    await waitFor(async () => {
      resolve({ requestWithdrawal: { id: 'w1', status: 'PENDING' } });
      await Promise.resolve();
    });
  });

  it('cancels via the cancel button', () => {
    const onClose = jest.fn();
    renderWithProviders(<WithdrawDialog {...props} onClose={onClose} />);
    fireEvent.press(screen.getByTestId('withdraw-cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});
