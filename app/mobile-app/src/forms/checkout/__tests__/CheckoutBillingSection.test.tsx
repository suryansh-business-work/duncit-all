import { useEffect } from 'react';
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

/** Harness that forces a billing-field error so the accordion turns red + stays open. */
function ErrorHarness() {
  const { control, setError } = useForm<CheckoutFormValues>({ defaultValues: checkoutDefaults });
  useEffect(() => {
    setError('line1', { message: 'Address line 1 is required' });
  }, [setError]);
  return <CheckoutBillingSection control={control} mainAddress={null} />;
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
  it('opens the Billing accordion by default with editable fields + save toggle', () => {
    renderWithProviders(<Harness mainAddress={null} />);
    expect(screen.queryByTestId('billing-same-as-main')).toBeNull();
    expect(screen.getByTestId('field-line1')).toBeOnTheScreen();
    expect(screen.getByTestId('billing-save-as-main')).toBeOnTheScreen();
    expect(screen.getByTestId('field-billing_email')).toBeOnTheScreen();
  });

  it('collapses + re-expands the Billing accordion on header press', () => {
    renderWithProviders(<Harness mainAddress={null} />);
    fireEvent.press(screen.getByTestId('billing-accordion-header'));
    expect(screen.queryByTestId('field-line1')).toBeNull();
    fireEvent.press(screen.getByTestId('billing-accordion-header'));
    expect(screen.getByTestId('field-line1')).toBeOnTheScreen();
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
    // No "save as main" when a main address already exists.
    expect(screen.queryByTestId('billing-save-as-main')).toBeNull();
  });

  it('renders a minimal summary without a second line or country', () => {
    renderWithProviders(<Harness mainAddress={minimalMain} sameAsMain />);
    expect(screen.getByTestId('billing-main-summary')).toBeOnTheScreen();
    expect(screen.getByText('Delhi, Delhi - 110001')).toBeOnTheScreen();
    expect(screen.queryByText('India')).toBeNull();
  });

  it('reveals editable fields (no save toggle) when same-as-main is toggled off', () => {
    renderWithProviders(<Harness mainAddress={fullMain} sameAsMain />);
    expect(screen.getByTestId('billing-main-summary')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('billing-same-as-main'));
    expect(screen.queryByTestId('billing-main-summary')).toBeNull();
    expect(screen.getByTestId('field-line1')).toBeOnTheScreen();
    expect(screen.queryByTestId('billing-save-as-main')).toBeNull();
  });

  it('reveals the GSTIN field only when the GST switch is on', () => {
    renderWithProviders(<Harness mainAddress={null} />);
    // GST accordion is collapsed by default.
    expect(screen.queryByTestId('billing-has-gstin')).toBeNull();
    fireEvent.press(screen.getByTestId('gst-accordion-header'));
    expect(screen.queryByTestId('field-gstin')).toBeNull();
    fireEvent(screen.getByTestId('billing-has-gstin'), 'valueChange', true);
    expect(screen.getByTestId('field-gstin')).toBeOnTheScreen();
    fireEvent(screen.getByTestId('billing-has-gstin'), 'valueChange', false);
    expect(screen.queryByTestId('field-gstin')).toBeNull();
  });

  it('keeps the Billing accordion open when a billing field has an error', () => {
    renderWithProviders(<ErrorHarness />);
    expect(screen.getByTestId('field-line1')).toBeOnTheScreen();
    // The error keeps it open even after a collapse tap.
    fireEvent.press(screen.getByTestId('billing-accordion-header'));
    expect(screen.getByTestId('field-line1')).toBeOnTheScreen();
  });
});
