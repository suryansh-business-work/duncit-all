import { act, fireEvent, screen } from '@testing-library/react-native';

import { WalletScreen } from '@/screens/WalletScreen';
import { useWallet } from '@/hooks/useWallet';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/components/AppHeader', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View: V } = require('react-native');
  return { AppHeader: () => <V testID="app-header-stub" /> };
});
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, goBack: jest.fn() }),
}));
jest.mock('@/hooks/useWallet', () => ({ useWallet: jest.fn() }));
interface MockDialogProps {
  open: boolean;
  onDone: () => void;
  onClose: () => void;
}
jest.mock('@/components/wallet/WithdrawDialog', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View: V } = require('react-native');
  return {
    WithdrawDialog: ({ open, onDone, onClose }: Readonly<MockDialogProps>) =>
      open ? (
        <>
          <V testID="mock-withdraw" />
          <V testID="mock-withdraw-done" onTouchEnd={onDone} />
          <V testID="mock-withdraw-close" onTouchEnd={onClose} />
        </>
      ) : null,
  };
});

const mockedUse = useWallet as jest.Mock;

const wallet = {
  balance: 1500,
  currency_symbol: '₹',
  payout_mode: 'IMMEDIATE',
  next_payout_at: '2026-06-20T00:00:00Z',
};
const transactions = [
  {
    id: 't1',
    type: 'CREDIT',
    amount: 1500,
    source: 'POD_COMPLETION',
    reason: 'Payout',
    created_at: '2026-06-13',
  },
  {
    id: 't2',
    type: 'DEBIT',
    amount: 500,
    source: 'WITHDRAWAL',
    reason: '',
    created_at: 'bad-date',
  },
];
const withdrawals = [
  {
    id: 'w1',
    amount: 500,
    status: 'PENDING',
    payout_method: 'UPI',
    scheduled_for: '2026-06-20',
    reject_reason: '',
    created_at: '2026-06-13',
  },
  {
    id: 'w2',
    amount: 300,
    status: 'REJECTED',
    payout_method: 'IMPS',
    scheduled_for: '2026-06-20',
    reject_reason: 'Bad account',
    created_at: '2026-06-13',
  },
  {
    id: 'w3',
    amount: 200,
    status: 'WEIRD',
    payout_method: 'NEFT',
    scheduled_for: '2026-06-20',
    reject_reason: '',
    created_at: '2026-06-13',
  },
];

const api = (over: Record<string, unknown> = {}) => ({
  wallet,
  transactions,
  withdrawals,
  isLoading: false,
  refetch: jest.fn().mockResolvedValue(undefined),
  ...over,
});

beforeEach(() => jest.clearAllMocks());

describe('WalletScreen', () => {
  it('shows the loading spinner before the wallet arrives', () => {
    mockedUse.mockReturnValue(
      api({ wallet: null, transactions: [], withdrawals: [], isLoading: true }),
    );
    renderWithProviders(<WalletScreen />);
    expect(screen.getByTestId('wallet-loading')).toBeOnTheScreen();
  });

  it('renders the balance, withdrawals and transactions, then opens + refetches on withdraw', () => {
    const hookApi = api();
    mockedUse.mockReturnValue(hookApi);
    renderWithProviders(<WalletScreen />);
    expect(screen.getByText('₹1500.00')).toBeOnTheScreen();
    expect(screen.getByText('Bad account', { exact: false })).toBeOnTheScreen();
    expect(screen.getByText('WEIRD')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('wallet-withdraw'));
    expect(screen.getByTestId('mock-withdraw')).toBeOnTheScreen();
    fireEvent(screen.getByTestId('mock-withdraw-close'), 'touchEnd');
    expect(screen.queryByTestId('mock-withdraw')).toBeNull();
    fireEvent.press(screen.getByTestId('wallet-withdraw'));
    fireEvent(screen.getByTestId('mock-withdraw-done'), 'touchEnd');
    expect(hookApi.refetch).toHaveBeenCalled();
  });

  it('disables withdraw and shows empty states with a zero balance', () => {
    mockedUse.mockReturnValue(
      api({
        wallet: { ...wallet, balance: 0, payout_mode: 'WEEKLY' },
        transactions: [],
        withdrawals: [],
      }),
    );
    renderWithProviders(<WalletScreen />);
    expect(screen.getByTestId('wallet-no-withdrawals')).toBeOnTheScreen();
    expect(screen.getByTestId('wallet-no-transactions')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('wallet-withdraw'));
    expect(screen.queryByTestId('mock-withdraw')).toBeNull();
  });

  it('keeps the screen up when a refetch fails, and tolerates an unknown payout mode', async () => {
    const hookApi = api({
      wallet: { ...wallet, payout_mode: 'OTHER' },
      refetch: jest.fn().mockRejectedValue(new Error('x')),
    });
    mockedUse.mockReturnValue(hookApi);
    renderWithProviders(<WalletScreen />);
    fireEvent.press(screen.getByTestId('wallet-withdraw'));
    await act(async () => {
      fireEvent(screen.getByTestId('mock-withdraw-done'), 'touchEnd');
      await Promise.resolve();
    });
    expect(screen.getByTestId('wallet-screen')).toBeOnTheScreen();
  });
});
