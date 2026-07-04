import { fireEvent, screen } from '@testing-library/react-native';
import { useForm } from 'react-hook-form';

import { CheckoutBillingSection } from '@/forms/checkout/CheckoutBillingSection';
import {
  checkoutDefaults,
  type CheckoutFormValues,
  type CheckoutMainAddress,
} from '@/forms/checkout/checkout.types';
import { renderWithProviders } from '@/utils/test-utils';

function Harness({
  mainAddress,
  sameAsMain = false,
}: Readonly<{ mainAddress: CheckoutMainAddress | null; sameAsMain?: boolean }>) {
  const { control } = useForm<CheckoutFormValues>({
    defaultValues: { ...checkoutDefaults, same_as_main: sameAsMain },
  });
  return <CheckoutBillingSection control={control} mainAddress={mainAddress} />;
}

const fullMain: CheckoutMainAddress = {
  line1: '9 Palm Road',
  line2: 'Flat 2',
  landmark: 'Near Lake',
  city: 'Delhi',
  state: 'Delhi',
  pincode: '110001',
  country: 'India',
};

const minimalMain: CheckoutMainAddress = {
  line1: '9 Palm Road',
  line2: '',
  landmark: '',
  city: 'Delhi',
  state: 'Delhi',
  pincode: '110001',
  country: '',
};

describe('CheckoutBillingSection', () => {
  it('shows editable fields + save toggle when there is no main address', () => {
    renderWithProviders(<Harness mainAddress={null} />);
    expect(screen.queryByTestId('billing-same-as-main')).toBeNull();
    expect(screen.getByTestId('field-line1')).toBeOnTheScreen();
    expect(screen.getByTestId('billing-save-as-main')).toBeOnTheScreen();
  });

  it('treats a blank saved address as no main address', () => {
    renderWithProviders(<Harness mainAddress={{ ...minimalMain, line1: '' }} />);
    expect(screen.queryByTestId('billing-same-as-main')).toBeNull();
    expect(screen.getByTestId('field-line1')).toBeOnTheScreen();
  });

  it('shows the read-only summary for a full saved address when same-as-main is on', () => {
    renderWithProviders(<Harness mainAddress={fullMain} sameAsMain />);
    expect(screen.getByTestId('billing-main-summary')).toBeOnTheScreen();
    expect(screen.getByText('9 Palm Road')).toBeOnTheScreen();
    expect(screen.getByText('Flat 2, Near Lake')).toBeOnTheScreen();
    expect(screen.getByText('Delhi, Delhi - 110001')).toBeOnTheScreen();
    expect(screen.getByText('India')).toBeOnTheScreen();
    expect(screen.queryByTestId('field-line1')).toBeNull();
  });

  it('renders a minimal summary without a second line or country', () => {
    renderWithProviders(<Harness mainAddress={minimalMain} sameAsMain />);
    expect(screen.getByTestId('billing-main-summary')).toBeOnTheScreen();
    expect(screen.getByText('Delhi, Delhi - 110001')).toBeOnTheScreen();
    expect(screen.queryByText('India')).toBeNull();
  });

  it('reveals editable fields when same-as-main is toggled off', () => {
    renderWithProviders(<Harness mainAddress={fullMain} sameAsMain />);
    expect(screen.getByTestId('billing-main-summary')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('billing-same-as-main'));
    expect(screen.queryByTestId('billing-main-summary')).toBeNull();
    expect(screen.getByTestId('field-line1')).toBeOnTheScreen();
    expect(screen.getByTestId('billing-save-as-main')).toBeOnTheScreen();
  });
});
