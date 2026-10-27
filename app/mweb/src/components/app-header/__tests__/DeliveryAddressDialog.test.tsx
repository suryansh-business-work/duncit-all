import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import DeliveryAddressDialog from '../DeliveryAddressDialog';
import { fallbackT } from '../../../i18n/fallback';
import type { UserAddress } from '../../../pages/account-page/address-book-form';

const address = (over: Partial<UserAddress>): UserAddress =>
  ({
    id: 'a1',
    label: 'Home',
    name: 'Asha Rao',
    line1: '12 MG Road',
    city: 'Bengaluru',
    pincode: '560001',
    is_default: true,
    ...over,
  }) as UserAddress;

const dialog = (over: Partial<Parameters<typeof DeliveryAddressDialog>[0]> = {}) => {
  const props = {
    open: true,
    onClose: vi.fn(),
    addresses: [address({}), address({ id: 'a2', label: 'Work', name: '', is_default: false, line1: '5 Brigade Rd' })],
    selectedId: 'a1',
    loading: false,
    failed: false,
    onRetry: vi.fn(),
    onSelect: vi.fn(),
    onManage: vi.fn(),
    ...over,
  };
  render(<DeliveryAddressDialog {...props} />);
  return props;
};

describe('DeliveryAddressDialog', () => {
  it('lists each address with the current one checked, a default tag and the formatted line', () => {
    dialog();
    const home = screen.getByTestId('delivery-address-option-a1');
    expect(home).toHaveTextContent('Home');
    expect(home).toHaveTextContent(fallbackT('mweb.checkout.addressDefault'));
    expect(home).toHaveTextContent('Asha Rao');
    expect(home).toHaveTextContent('12 MG Road, Bengaluru 560001');
    const work = screen.getByTestId('delivery-address-option-a2');
    expect(work).not.toHaveTextContent(fallbackT('mweb.checkout.addressDefault'));
    expect(screen.getByRole('radio', { name: /Home/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Work/ })).not.toBeChecked();
    expect(screen.getByTestId('delivery-address-manage')).toHaveTextContent(fallbackT('mweb.shop.manageAddresses'));
  });

  it('reports the picked address id and the manage press', () => {
    const props = dialog();
    fireEvent.click(screen.getByRole('radio', { name: /Work/ }));
    expect(props.onSelect).toHaveBeenCalledWith('a2');
    fireEvent.click(screen.getByTestId('delivery-address-manage'));
    expect(props.onManage).toHaveBeenCalledTimes(1);
  });

  it('shows a spinner while loading', () => {
    dialog({ loading: true });
    expect(screen.getByRole('progressbar', { name: fallbackT('mweb.a11y.loading') })).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  it('shows the load error with a working retry', () => {
    const props = dialog({ failed: true });
    expect(screen.getByTestId('delivery-address-error')).toHaveTextContent(fallbackT('mweb.shop.addressesLoadError'));
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.shop.retry') }));
    expect(props.onRetry).toHaveBeenCalledTimes(1);
  });

  it('prompts to add the first address when the book is empty', () => {
    dialog({ addresses: [] });
    expect(screen.getByTestId('delivery-address-empty')).toHaveTextContent(fallbackT('mweb.shop.noSavedAddresses'));
    expect(screen.getByTestId('delivery-address-manage')).toHaveTextContent(fallbackT('mweb.shop.addDeliveryAddress'));
  });
});
