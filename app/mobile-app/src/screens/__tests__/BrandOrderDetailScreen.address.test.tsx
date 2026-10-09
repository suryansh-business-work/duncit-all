import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { useBrandOrder } from '@/hooks/useBrandOrder';
import { BrandOrderDetailScreen } from '@/screens/BrandOrderDetailScreen';
import { brandOrderState, SCREEN_ADDRESS, SCREEN_ORDER } from '@/utils/brand-order-fixture';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: { id: 'o1' } }),
}));
jest.mock('@/hooks/useBrandOrder', () => ({ useBrandOrder: jest.fn() }));
// Anything else a screen asks the server for (the date settings) stays pending.
jest.mock('@/services/graphql.client', () => ({
  graphqlRequest: jest.fn(() => new Promise(() => undefined)),
}));
const mockedOrder = useBrandOrder as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockedOrder.mockReturnValue(brandOrderState());
});

describe('BrandOrderDetailScreen — fix address sheet', () => {
  it('fixes the address through the sheet, closing it once saved', async () => {
    const desk = brandOrderState();
    mockedOrder.mockReturnValue(desk);
    renderWithProviders(<BrandOrderDetailScreen />);
    fireEvent.press(screen.getByTestId('brand-order-fix-address'));
    expect(await screen.findByTestId('ship-to-sheet')).toBeOnTheScreen();

    // The order's pincode is one digit short — the courier rule refuses it.
    fireEvent.press(screen.getByTestId('ship-to-save'));
    expect(await screen.findByText('Enter a valid pincode')).toBeOnTheScreen();
    expect(desk.saveAddress).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByTestId('field-pincode'), '560038');
    fireEvent.press(screen.getByTestId('ship-to-save'));
    await waitFor(() => expect(desk.saveAddress).toHaveBeenCalled());
    const { email, ...form } = SCREEN_ADDRESS;
    expect(email).toBeTruthy();
    expect(desk.saveAddress.mock.calls[0][0]).toEqual({ ...form, pincode: '560038' });
    await waitFor(() => expect(screen.queryByTestId('ship-to-sheet')).toBeNull());
  });

  it('keeps the sheet open when the save is refused, and cancels', async () => {
    const desk = brandOrderState({
      order: { ...SCREEN_ORDER, shipping_address: { ...SCREEN_ADDRESS, pincode: '560038' } },
    });
    desk.saveAddress.mockResolvedValue(false);
    mockedOrder.mockReturnValue(desk);
    renderWithProviders(<BrandOrderDetailScreen />);
    fireEvent.press(screen.getByTestId('brand-order-fix-address'));
    fireEvent.press(await screen.findByTestId('ship-to-save'));
    await waitFor(() => expect(desk.saveAddress).toHaveBeenCalled());
    expect(screen.getByTestId('ship-to-sheet')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('ship-to-cancel'));
    await waitFor(() => expect(screen.queryByTestId('ship-to-sheet')).toBeNull());
  });
});
