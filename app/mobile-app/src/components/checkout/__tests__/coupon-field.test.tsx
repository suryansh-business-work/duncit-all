import { fireEvent, screen } from '@testing-library/react-native';

import { CouponField } from '@/components/checkout';
import type { CouponPreview } from '@/hooks/useCheckout';
import { renderWithProviders } from '@/utils/test-utils';

const applied = {
  ok: true,
  message: null,
  code: 'TEN',
  discount_pct: 10,
  original_total: 500,
  discount_amount: 50,
  final_total: 450,
  currency_symbol: '₹',
} as CouponPreview;

describe('CouponField', () => {
  it('applies a typed code', () => {
    const onApply = jest.fn();
    const setCode = jest.fn();
    renderWithProviders(
      <CouponField
        code="TEN"
        setCode={setCode}
        applied={null}
        error={null}
        applying={false}
        currency="₹"
        onApply={onApply}
        onRemove={jest.fn()}
      />,
    );
    fireEvent.changeText(screen.getByTestId('coupon-input'), 'save');
    expect(setCode).toHaveBeenCalledWith('SAVE');
    fireEvent.press(screen.getByTestId('coupon-apply'));
    expect(onApply).toHaveBeenCalled();
  });

  it('shows the error message', () => {
    renderWithProviders(
      <CouponField
        code="BAD"
        setCode={jest.fn()}
        applied={null}
        error="Coupon has expired"
        applying={false}
        currency="₹"
        onApply={jest.fn()}
        onRemove={jest.fn()}
      />,
    );
    expect(screen.getByTestId('coupon-error')).toHaveTextContent('Coupon has expired');
  });

  it('renders the applied state and removes it', () => {
    const onRemove = jest.fn();
    renderWithProviders(
      <CouponField
        code="TEN"
        setCode={jest.fn()}
        applied={applied}
        error={null}
        applying={false}
        currency="₹"
        onApply={jest.fn()}
        onRemove={onRemove}
      />,
    );
    expect(screen.getByTestId('coupon-applied')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('coupon-remove'));
    expect(onRemove).toHaveBeenCalled();
  });
});
