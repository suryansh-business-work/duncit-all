import { fireEvent, screen } from '@testing-library/react-native';

import { CouponsSheet } from '@/components/checkout/CouponsSheet';
import { CouponScope } from '@/generated/graphql/graphql';
import type { AvailableCoupon } from '@/hooks/useCheckout';
import { renderWithProviders } from '@/utils/test-utils';

const coupons: AvailableCoupon[] = [
  {
    id: 'c1',
    code: 'SAVE20',
    description: 'Festive offer',
    discount_pct: 20,
    min_order_amount: 300,
    scope: CouponScope.Global,
  },
  {
    id: 'c2',
    code: 'PODONLY',
    description: '',
    discount_pct: 15,
    min_order_amount: 0,
    scope: CouponScope.Pod,
  },
];

describe('CouponsSheet', () => {
  it('lists coupons, picks one and closes', () => {
    const onPick = jest.fn();
    const onClose = jest.fn();
    renderWithProviders(
      <CouponsSheet open coupons={coupons} currency="₹" onClose={onClose} onPick={onPick} />,
    );
    expect(screen.getByText('Festive offer · Min ₹300')).toBeOnTheScreen();
    expect(screen.getByText('For this pod')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('coupon-pick-SAVE20'));
    expect(onPick).toHaveBeenCalledWith('SAVE20');
    fireEvent.press(screen.getByTestId('coupons-sheet-close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows an empty state and closes via the backdrop', () => {
    const onClose = jest.fn();
    renderWithProviders(
      <CouponsSheet open coupons={[]} currency="₹" onClose={onClose} onPick={jest.fn()} />,
    );
    expect(screen.getByTestId('coupons-empty')).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalled();
  });
});
