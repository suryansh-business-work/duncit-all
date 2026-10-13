import { act, fireEvent, screen } from '@testing-library/react-native';
import { CART_CONTROL_NOTICE_MS } from '@duncit/utils';

import { ProductQuantityBar } from '@/components/details/ProductQuantityBar';
import { renderWithProviders } from '@/utils/test-utils';

describe('ProductQuantityBar', () => {
  it('renders nothing when the pod is view-only', () => {
    renderWithProviders(
      <ProductQuantityBar name="Tee" quantity={0} maxQuantity={5} readOnly onUpdate={jest.fn()} />,
    );
    expect(screen.queryByTestId('product-detail-add')).toBeNull();
  });

  it('renders nothing when no update handler is wired', () => {
    renderWithProviders(<ProductQuantityBar name="Tee" quantity={0} maxQuantity={5} />);
    expect(screen.queryByTestId('product-detail-add')).toBeNull();
  });

  it('adds the product to the selection from the add button', () => {
    const onUpdate = jest.fn();
    renderWithProviders(
      <ProductQuantityBar name="Tee" quantity={0} maxQuantity={5} onUpdate={onUpdate} />,
    );
    expect(screen.getByTestId('product-detail-add').props['aria-label']).toBe('Add Tee');
    expect(screen.queryByTestId('product-detail-out-of-stock')).toBeNull();
    fireEvent.press(screen.getByTestId('product-detail-add'));
    expect(onUpdate).toHaveBeenCalledWith(1);
  });

  it('shows a non-tappable out-of-stock button when there is no stock', () => {
    const onUpdate = jest.fn();
    renderWithProviders(
      <ProductQuantityBar name="Tee" quantity={0} maxQuantity={0} onUpdate={onUpdate} />,
    );
    expect(screen.getByText('Out of stock')).toBeOnTheScreen();
    expect(screen.getByTestId('product-detail-add').props['aria-disabled']).toBe(true);
    fireEvent.press(screen.getByTestId('product-detail-add'));
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('increments and decrements within available stock', () => {
    const onUpdate = jest.fn();
    renderWithProviders(
      <ProductQuantityBar name="Tee" quantity={2} maxQuantity={5} onUpdate={onUpdate} />,
    );
    expect(screen.getByTestId('product-detail-qty')).toHaveTextContent('2');
    fireEvent.press(screen.getByTestId('product-detail-inc'));
    expect(onUpdate).toHaveBeenCalledWith(3);
    fireEvent.press(screen.getByTestId('product-detail-dec'));
    expect(onUpdate).toHaveBeenCalledWith(1);
  });

  it('removes the product from the same button once one unit is left', () => {
    const onUpdate = jest.fn();
    renderWithProviders(
      <ProductQuantityBar name="Tee" quantity={1} maxQuantity={5} onUpdate={onUpdate} />,
    );
    const remove = screen.getByTestId('product-detail-dec');
    expect(remove.props['aria-label']).toBe('Remove Tee');
    fireEvent.press(remove);
    expect(onUpdate).toHaveBeenCalledWith(0);
  });

  it('disables the increment button at max stock', () => {
    const onUpdate = jest.fn();
    renderWithProviders(
      <ProductQuantityBar name="Tee" quantity={5} maxQuantity={5} onUpdate={onUpdate} />,
    );
    // At max stock the + button is aria-disabled (clamped so it can't exceed stock).
    expect(screen.getByTestId('product-detail-inc').props['aria-disabled']).toBe(true);
    fireEvent.press(screen.getByTestId('product-detail-inc'));
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('raises the added / removed notice for a moment as the product goes in and out', () => {
    jest.useFakeTimers();
    try {
      const bar = (quantity: number) => (
        <ProductQuantityBar name="Tee" quantity={quantity} maxQuantity={5} onUpdate={jest.fn()} />
      );
      const { rerender } = renderWithProviders(bar(0));
      expect(screen.queryByTestId('product-detail-notice')).toBeNull();

      rerender(bar(1));
      expect(screen.getByTestId('product-detail-notice')).toHaveTextContent('Item added');
      act(() => {
        jest.advanceTimersByTime(CART_CONTROL_NOTICE_MS);
      });
      expect(screen.queryByTestId('product-detail-notice')).toBeNull();

      rerender(bar(0));
      expect(screen.getByTestId('product-detail-notice')).toHaveTextContent('Item removed');
    } finally {
      jest.useRealTimers();
    }
  });
});
