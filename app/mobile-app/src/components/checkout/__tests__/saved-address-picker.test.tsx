import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { SavedAddressPicker } from '@/components/checkout/SavedAddressPicker';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const addr = (over: Record<string, unknown> = {}) => ({
  id: 'a1',
  label: 'Home',
  name: 'Riya',
  phone: '9876543210',
  email: '',
  line1: '12 MG Road',
  line2: '',
  landmark: '',
  city: 'Pune',
  state: 'Maharashtra',
  pincode: '411001',
  country: 'India',
  is_default: true,
  ...over,
});

const fieldLabel = () => screen.getByTestId('checkout-address-field-label').props.children;

beforeEach(() => mockRequest.mockReset());

describe('SavedAddressPicker', () => {
  it('renders nothing while the address book is empty', async () => {
    mockRequest.mockResolvedValue({ myAddresses: [] });
    renderWithProviders(<SavedAddressPicker onPick={jest.fn()} />);
    await waitFor(() => expect(mockRequest).toHaveBeenCalled());
    expect(screen.queryByTestId('checkout-address-picker')).toBeNull();
  });

  it('stays hidden when the address query fails', async () => {
    mockRequest.mockRejectedValue(new Error('offline'));
    renderWithProviders(<SavedAddressPicker onPick={jest.fn()} />);
    await waitFor(() => expect(mockRequest).toHaveBeenCalled());
    expect(screen.queryByTestId('checkout-address-picker')).toBeNull();
  });

  it('auto-selects the default and lets the buyer pick another (re-firing onPick)', async () => {
    const onPick = jest.fn();
    mockRequest.mockResolvedValue({
      myAddresses: [
        addr(),
        addr({ id: 'a2', label: 'Work', line1: '99 Tech Park', city: 'Mumbai', is_default: false }),
      ],
    });
    renderWithProviders(<SavedAddressPicker onPick={onPick} />);

    await waitFor(() => expect(onPick).toHaveBeenCalled());
    expect(onPick.mock.calls[0]![0].id).toBe('a1');
    expect(fieldLabel()).toBe('Home (default) — 12 MG Road, Pune');

    // Open the sheet and pick the non-default address.
    fireEvent.press(screen.getByTestId('checkout-address-field'));
    fireEvent.press(screen.getByTestId('checkout-address-option-a2'));
    expect(onPick.mock.calls.at(-1)![0].id).toBe('a2');
    expect(fieldLabel()).toBe('Work — 99 Tech Park, Mumbai');
  });

  it('falls back to the first address when none is marked default, and closes via the backdrop', async () => {
    const onPick = jest.fn();
    mockRequest.mockResolvedValue({
      myAddresses: [
        addr({ is_default: false }),
        addr({ id: 'a2', label: 'Work', is_default: false }),
      ],
    });
    renderWithProviders(<SavedAddressPicker onPick={onPick} />);

    await waitFor(() => expect(onPick).toHaveBeenCalled());
    // No default → the first address is selected (no "(default)" suffix).
    expect(onPick.mock.calls[0]![0].id).toBe('a1');
    expect(fieldLabel()).toBe('Home — 12 MG Road, Pune');

    fireEvent.press(screen.getByTestId('checkout-address-field'));
    fireEvent.press(screen.getByTestId('checkout-address-backdrop'));
    // Dismissing keeps the current selection.
    expect(fieldLabel()).toBe('Home — 12 MG Road, Pune');
  });

  it('ignores a late addresses response after unmount', async () => {
    let resolve: (value: unknown) => void = () => {};
    mockRequest.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const { unmount } = renderWithProviders(<SavedAddressPicker onPick={jest.fn()} />);
    unmount();
    await act(async () => {
      resolve({ myAddresses: [addr()] });
    });
    expect(mockRequest).toHaveBeenCalled();
  });
});
