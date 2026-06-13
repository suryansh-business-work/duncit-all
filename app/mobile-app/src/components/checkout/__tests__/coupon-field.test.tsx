import { fireEvent, screen } from '@testing-library/react-native';

import { CouponField } from '@/components/checkout';
import { CouponScope } from '@/generated/graphql/graphql';
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
        available={[]}
        onApply={onApply}
        onRemove={jest.fn()}
      />,
    );
    fireEvent.changeText(screen.getByTestId('coupon-input'), 'save');
    expect(setCode).toHaveBeenCalledWith('SAVE');
    fireEvent.press(screen.getByTestId('coupon-apply'));
    fireEvent(screen.getByTestId('coupon-input'), 'submitEditing');
    expect(onApply).toHaveBeenCalledTimes(2);
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
        available={[]}
        onApply={jest.fn()}
        onRemove={jest.fn()}
      />,
    );
    expect(screen.getByTestId('coupon-error')).toHaveTextContent('Coupon has expired');
  });

  it('shows available coupons and applies a picked one (B2-#3)', () => {
    const onApply = jest.fn();
    const setCode = jest.fn();
    renderWithProviders(
      <CouponField
        code=""
        setCode={setCode}
        applied={null}
        error={null}
        applying={false}
        currency="₹"
        available={[
          {
            id: 'c1',
            code: 'SAVE20',
            description: '',
            discount_pct: 20,
            min_order_amount: 0,
            scope: CouponScope.Global,
          },
        ]}
        onApply={onApply}
        onRemove={jest.fn()}
      />,
    );
    // Open then close the sheet (covers onClose), reopen and pick.
    fireEvent.press(screen.getByTestId('coupon-view-available'));
    fireEvent.press(screen.getByTestId('coupons-sheet-close'));
    fireEvent.press(screen.getByTestId('coupon-view-available'));
    fireEvent.press(screen.getByTestId('coupon-pick-SAVE20'));
    expect(setCode).toHaveBeenCalledWith('SAVE20');
    expect(onApply).toHaveBeenCalledWith('SAVE20');
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
        available={[]}
        onApply={jest.fn()}
        onRemove={onRemove}
      />,
    );
    expect(screen.getByTestId('coupon-applied')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('coupon-remove'));
    expect(onRemove).toHaveBeenCalled();
  });
});
