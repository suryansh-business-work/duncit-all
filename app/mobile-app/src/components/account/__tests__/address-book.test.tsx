import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { AddressBookSection } from '@/components/account/AddressBookSection';
import {
  AddressFormSheet,
  addressSchema,
  blankAddressValues,
} from '@/components/account/AddressFormSheet';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const address = (over: Record<string, unknown> = {}) => ({
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

beforeEach(() => mockRequest.mockReset());

describe('addressSchema', () => {
  const valid = {
    ...blankAddressValues,
    line1: '12 MG Road',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411001',
  };
  it('accepts a complete address and rejects missing/invalid fields', () => {
    expect(addressSchema.safeParse(valid).success).toBe(true);
    expect(addressSchema.safeParse({ ...valid, line1: '' }).success).toBe(false);
    expect(addressSchema.safeParse({ ...valid, city: '' }).success).toBe(false);
    expect(addressSchema.safeParse({ ...valid, state: ' ' }).success).toBe(false);
    expect(addressSchema.safeParse({ ...valid, pincode: 'abc' }).success).toBe(false);
    expect(addressSchema.safeParse({ ...valid, label: '' }).success).toBe(false);
  });
});

describe('AddressBookSection', () => {
  it('lists saved addresses (default badge), and deletes one', async () => {
    mockRequest.mockImplementation((doc: unknown) => {
      const source = JSON.stringify(doc);
      if (source.includes('MobileMyAddresses'))
        return Promise.resolve({
          myAddresses: [address(), address({ id: 'a2', label: 'Office', is_default: false })],
        });
      if (source.includes('MobileDeleteMyAddress'))
        return Promise.resolve({ deleteMyAddress: true });
      return Promise.resolve({});
    });
    renderWithProviders(<AddressBookSection />);
    await waitFor(() => expect(screen.getByText('Home')).toBeOnTheScreen());
    expect(screen.getByText('DEFAULT')).toBeOnTheScreen();
    expect(screen.getByText('Office')).toBeOnTheScreen();

    await act(async () => {
      fireEvent.press(screen.getByTestId('address-delete-a2'));
    });
    const deleteCall = mockRequest.mock.calls.find((c) =>
      JSON.stringify(c[0]).includes('MobileDeleteMyAddress'),
    );
    expect(deleteCall![1]).toEqual({ id: 'a2' });
  });

  it('adds a new address through the RHF+Zod sheet (validation first)', async () => {
    mockRequest.mockImplementation((doc: unknown) => {
      const source = JSON.stringify(doc);
      if (source.includes('MobileMyAddresses')) return Promise.resolve({ myAddresses: [] });
      if (source.includes('MobileSaveMyAddress'))
        return Promise.resolve({ saveMyAddress: address() });
      return Promise.resolve({});
    });
    renderWithProviders(<AddressBookSection />);
    await waitFor(() =>
      expect(screen.getByText(/save delivery addresses here/i)).toBeOnTheScreen(),
    );
    fireEvent.press(screen.getByTestId('address-add'));

    // Submitting the blank form surfaces the Zod errors, nothing is sent.
    await act(async () => {
      fireEvent.press(screen.getByTestId('address-save'));
    });
    expect(screen.getByTestId('address-line1-error')).toBeOnTheScreen();

    fireEvent.changeText(screen.getByTestId('address-line1'), '12 MG Road');
    fireEvent.changeText(screen.getByTestId('address-city'), 'Pune');
    fireEvent.changeText(screen.getByTestId('address-state'), 'Maharashtra');
    fireEvent.changeText(screen.getByTestId('address-pincode'), '411001');
    await act(async () => {
      fireEvent.press(screen.getByTestId('address-save'));
    });
    const saveCall = mockRequest.mock.calls.find((c) =>
      JSON.stringify(c[0]).includes('MobileSaveMyAddress'),
    );
    expect(saveCall![1]).toMatchObject({
      id: null,
      input: expect.objectContaining({ line1: '12 MG Road', city: 'Pune', pincode: '411001' }),
    });
  });

  it('edits an existing address (prefilled) and surfaces save failures', async () => {
    mockRequest.mockImplementation((doc: unknown) => {
      const source = JSON.stringify(doc);
      if (source.includes('MobileMyAddresses'))
        return Promise.resolve({ myAddresses: [address()] });
      if (source.includes('MobileSaveMyAddress')) return Promise.reject(new Error('nope'));
      return Promise.resolve({});
    });
    renderWithProviders(<AddressBookSection />);
    await waitFor(() => expect(screen.getByText('Home')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('address-edit-a1'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('address-save'));
    });
    await waitFor(() => expect(screen.getByTestId('address-error')).toHaveTextContent('nope'));
    // Cancel closes the sheet.
    fireEvent.press(screen.getByTestId('address-cancel'));
  });

  it('surfaces list/delete failures', async () => {
    mockRequest.mockRejectedValue(new Error('offline'));
    renderWithProviders(<AddressBookSection />);
    await waitFor(() => expect(screen.getByTestId('address-error')).toHaveTextContent('offline'));
  });

  it('surfaces a delete failure while the list still loads', async () => {
    mockRequest.mockImplementation((doc: unknown) => {
      const source = JSON.stringify(doc);
      if (source.includes('MobileMyAddresses'))
        return Promise.resolve({ myAddresses: [address()] });
      if (source.includes('MobileDeleteMyAddress'))
        return Promise.reject(new Error('cannot delete'));
      return Promise.resolve({});
    });
    renderWithProviders(<AddressBookSection />);
    await waitFor(() => expect(screen.getByText('Home')).toBeOnTheScreen());
    await act(async () => {
      fireEvent.press(screen.getByTestId('address-delete-a1'));
    });
    await waitFor(() =>
      expect(screen.getByTestId('address-error')).toHaveTextContent('cannot delete'),
    );
  });

  it('the form sheet blocks saves while one is in flight and prefills an initial value', () => {
    const onSubmit = jest.fn();
    renderWithProviders(
      <AddressFormSheet
        open
        title="Edit address"
        initial={{
          ...blankAddressValues,
          line1: '12 MG Road',
          city: 'Pune',
          state: 'MH',
          pincode: '411001',
        }}
        saving
        onCancel={jest.fn()}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.press(screen.getByTestId('address-save'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('the form sheet submits prefilled values when not saving (default prop)', async () => {
    const onSubmit = jest.fn();
    renderWithProviders(
      <AddressFormSheet
        open
        title="Edit address"
        initial={{
          ...blankAddressValues,
          line1: '12 MG Road',
          city: 'Pune',
          state: 'MH',
          pincode: '411001',
        }}
        onCancel={jest.fn()}
        onSubmit={onSubmit}
      />,
    );
    await act(async () => {
      fireEvent.press(screen.getByTestId('address-save'));
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({ line1: '12 MG Road', city: 'Pune' });
  });
});
