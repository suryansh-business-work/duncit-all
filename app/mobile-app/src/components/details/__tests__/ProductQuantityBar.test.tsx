import { fireEvent, screen } from '@testing-library/react-native';

import { ProductQuantityBar } from '@/components/details/ProductQuantityBar';
import { renderWithProviders } from '@/utils/test-utils';

describe('ProductQuantityBar', () => {
  it('renders nothing when the pod is view-only', () => {
    renderWithProviders(
      <ProductQuantityBar
        quantity={0}
        maxQuantity={5}
        primary="#f60"
        readOnly
        onUpdate={jest.fn()}
      />,
    );
    expect(screen.queryByTestId('product-detail-add')).toBeNull();
  });

  it('renders nothing when no update handler is wired', () => {
    renderWithProviders(<ProductQuantityBar quantity={0} maxQuantity={5} primary="#f60" />);
    expect(screen.queryByTestId('product-detail-add')).toBeNull();
  });

  it('adds the product to the selection from the add button', () => {
    const onUpdate = jest.fn();
    renderWithProviders(
      <ProductQuantityBar quantity={0} maxQuantity={5} primary="#f60" onUpdate={onUpdate} />,
    );
    fireEvent.press(screen.getByTestId('product-detail-add'));
    expect(onUpdate).toHaveBeenCalledWith(1);
  });

  it('shows a non-tappable out-of-stock button when there is no stock', () => {
    const onUpdate = jest.fn();
    renderWithProviders(
      <ProductQuantityBar quantity={0} maxQuantity={0} primary="#f60" onUpdate={onUpdate} />,
    );
    expect(screen.getByText('Out of stock')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('product-detail-add'));
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('increments, decrements and removes within available stock', () => {
    const onUpdate = jest.fn();
    renderWithProviders(
      <ProductQuantityBar quantity={2} maxQuantity={5} primary="#f60" onUpdate={onUpdate} />,
    );
    expect(screen.getByTestId('product-detail-qty')).toHaveTextContent('2');
    fireEvent.press(screen.getByTestId('product-detail-inc'));
    expect(onUpdate).toHaveBeenCalledWith(3);
    fireEvent.press(screen.getByTestId('product-detail-dec'));
    expect(onUpdate).toHaveBeenCalledWith(1);
    fireEvent.press(screen.getByTestId('product-detail-remove'));
    expect(onUpdate).toHaveBeenCalledWith(0);
  });

  it('disables the increment button at max stock', () => {
    renderWithProviders(
      <ProductQuantityBar quantity={5} maxQuantity={5} primary="#f60" onUpdate={jest.fn()} />,
    );
    // At max stock the + button is aria-disabled (clamped so it can't exceed stock).
    expect(screen.getByTestId('product-detail-inc').props['aria-disabled']).toBe(true);
  });
});
