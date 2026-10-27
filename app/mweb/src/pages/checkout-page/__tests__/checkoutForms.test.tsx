import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { useEffect, type ReactNode } from 'react';
import { useForm, type Control } from 'react-hook-form';

import GstSection from '../GstSection';
import BillingAddressSection from '../BillingAddressSection';
import ContactSummaryCard from '../ContactSummaryCard';
import { CheckoutFields, checkoutDefaults, resolveBillingAddress } from '../checkout';
import { useCheckoutBillingForm } from '../useCheckoutBillingForm';
import type { CheckoutForm } from '../queries';
import { fallbackT } from '../../../i18n/fallback';

const h = vi.hoisted(() => ({ updateProfile: vi.fn() }));

vi.mock('@apollo/client/react', async (orig) => ({
  ...(await orig<object>()),
  useMutation: () => [h.updateProfile, { loading: false }],
}));

function Harness({
  defaults = {},
  errors = [],
  children,
}: Readonly<{
  defaults?: Partial<CheckoutForm>;
  errors?: Array<'line1' | 'billing_email'>;
  children: (control: Control<CheckoutForm>) => ReactNode;
}>) {
  const { control, setError } = useForm<CheckoutForm>({ defaultValues: { ...checkoutDefaults, ...defaults } });
  useEffect(() => {
    errors.forEach((name) => setError(name, { message: 'bad value' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <>{children(control)}</>;
}

const fields = (control: Control<CheckoutForm>, dummyMode: boolean) => (
  <CheckoutFields
    control={control}
    fieldSx={{}}
    dummyMode={dummyMode}
    selectMenuProps={{}}
    mainAddress={null}
    hasMainAddress={false}
    contact={null}
    contactLoading={false}
    addressRequired
  />
);

beforeEach(() => {
  vi.clearAllMocks();
  h.updateProfile.mockResolvedValue({ data: {} });
});

describe('GstSection', () => {
  it('is collapsed with no GSTIN field, and reveals the field when the buyer says they have one', () => {
    render(<Harness>{(control) => <GstSection control={control} fieldSx={{}} />}</Harness>);
    expect(screen.queryByTestId('gst-section-gstin')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('gst-details-header'));
    fireEvent.click(screen.getByTestId('billing-has-gstin').querySelector('input') as HTMLElement);
    expect(screen.getByTestId('gst-section-gstin')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('billing-has-gstin').querySelector('input') as HTMLElement);
    expect(screen.queryByTestId('gst-section-gstin')).not.toBeInTheDocument();
  });

  it('opens on a saved GSTIN', () => {
    render(
      <Harness defaults={{ has_gstin: true, gstin: '22AAAAA0000A1Z5' }}>
        {(control) => <GstSection control={control} fieldSx={{}} />}
      </Harness>
    );
    fireEvent.click(screen.getByTestId('gst-details-header'));
    expect(screen.getByTestId('gst-section-gstin').querySelector('input')).toHaveValue('22AAAAA0000A1Z5');
  });
});

describe('BillingAddressSection', () => {
  const main = { line1: '1 Main', line2: '', landmark: '', city: 'Pune', state: 'MH', pincode: '411001', country: 'India' };
  const section = (props: { hasMain?: boolean; errors?: Array<'line1' | 'billing_email'>; defaults?: Partial<CheckoutForm> }) =>
    render(
      <Harness defaults={props.defaults} errors={props.errors}>
        {(control) => (
          <BillingAddressSection
            control={control}
            fieldSx={{}}
            mainAddress={props.hasMain ? main : null}
            hasMainAddress={Boolean(props.hasMain)}
            addressRequired
          />
        )}
      </Harness>
    );

  it('offers to save a new address as the main one when there is none saved', () => {
    section({});
    expect(screen.getByTestId('billing-save-as-main')).toBeInTheDocument();
    expect(screen.queryByTestId('billing-same-as-main')).not.toBeInTheDocument();
  });

  it('offers same-as-main and shows the saved address summary when chosen, hiding the editable fields', () => {
    section({ hasMain: true, defaults: { same_as_main: true } });
    expect(screen.getByTestId('billing-same-as-main')).toBeInTheDocument();
    expect(screen.queryByTestId('billing-save-as-main')).not.toBeInTheDocument();
    expect(screen.getByText(/1 Main/)).toBeInTheDocument();
  });

  it('collapses and expands, but stays open while a billing field has an error', async () => {
    const { unmount } = section({});
    const header = screen.getByTestId('billing-address-header');
    expect(header).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(header);
    await waitFor(() => expect(header).toHaveAttribute('aria-expanded', 'false'));
    unmount();
    section({ errors: ['line1'] });
    const flagged = screen.getByTestId('billing-address-header');
    fireEvent.click(flagged);
    expect(flagged).toHaveAttribute('aria-expanded', 'true');
  });
});

describe('ContactSummaryCard fallbacks', () => {
  const card = (contact: object | null, defaults: Partial<CheckoutForm> = {}) =>
    render(
      <Harness defaults={defaults}>
        {(control) => <ContactSummaryCard control={control} contact={contact as never} loading={false} />}
      </Harness>
    );

  it('shows a dash for a missing value', () => {
    card(null, { phone_extension: '' });
    expect(screen.getByTestId('contact-summary-card-name')).toHaveTextContent('—');
    expect(screen.getByTestId('contact-summary-card-phone')).toHaveTextContent('—');
  });

  it('falls back to the form values when the profile has none, including the extension', () => {
    card(
      { fullName: '', email: '', phoneExtension: '', phoneNumber: '' },
      { full_name: 'Form Name', email: 'f@x.com', phone_extension: '+44', phone_number: '700' }
    );
    expect(screen.getByTestId('contact-summary-card-name')).toHaveTextContent('Form Name');
    expect(screen.getByTestId('contact-summary-card-email')).toHaveTextContent('f@x.com');
    expect(screen.getByTestId('contact-summary-card-phone')).toHaveTextContent('+44 700');
  });

  it('prefers the profile over the form, with the form extension when the profile has no extension', () => {
    card({ fullName: 'Profile Name', email: 'p@x.com', phoneExtension: '', phoneNumber: '98' }, { full_name: 'Form Name', phone_extension: '+91' });
    expect(screen.getByTestId('contact-summary-card-name')).toHaveTextContent('Profile Name');
    expect(screen.getByTestId('contact-summary-card-phone')).toHaveTextContent('+91 98');
  });

  it('prefers the profile extension too', () => {
    card({ fullName: 'A', email: 'a@x.com', phoneExtension: '+1', phoneNumber: '5' }, { phone_extension: '+91' });
    expect(screen.getByTestId('contact-summary-card-phone')).toHaveTextContent('+1 5');
  });
});

describe('CheckoutFields', () => {
  it('shows the payment simulator only on the dummy gateway, defaulting to a successful payment', () => {
    const { rerender } = render(<Harness>{(control) => fields(control, false)}</Harness>);
    expect(screen.queryByTestId('simulate-failure')).not.toBeInTheDocument();
    rerender(<Harness>{(control) => fields(control, true)}</Harness>);
    expect(screen.getByTestId('simulate-failure')).toHaveTextContent(fallbackT('mweb.checkout.successfulPayment'));
  });

  it('shows a failed payment as selected and switches back to a successful one', async () => {
    render(<Harness defaults={{ simulate_failure: true }}>{(control) => fields(control, true)}</Harness>);
    expect(screen.getByTestId('simulate-failure')).toHaveTextContent(fallbackT('mweb.checkout.failedPayment'));
    fireEvent.mouseDown(screen.getByTestId('simulate-failure').querySelector('[role="combobox"]') as HTMLElement);
    fireEvent.click(await screen.findByTestId('simulate-failure-success'));
    await waitFor(() => expect(screen.getByTestId('simulate-failure')).toHaveTextContent(fallbackT('mweb.checkout.successfulPayment')));
  });
});

describe('resolveBillingAddress with the main address', () => {
  const values = (over: Partial<CheckoutForm> = {}): CheckoutForm => ({ ...checkoutDefaults, same_as_main: true, line1: 'typed', ...over });

  it('uses the trimmed main address instead of what was typed', () => {
    const main = { line1: ' 1 Main ', line2: ' B ', landmark: ' Park ', city: ' Pune ', state: ' MH ', pincode: ' 411001 ', country: ' India ' };
    expect(resolveBillingAddress(values(), main)).toEqual({ line1: '1 Main', line2: 'B', landmark: 'Park', city: 'Pune', state: 'MH', pincode: '411001', country: 'India' });
  });

  it('blanks missing main-address parts and defaults the country to India', () => {
    const empty = { line1: null, line2: null, landmark: null, city: null, state: null, pincode: null, country: null };
    expect(resolveBillingAddress(values(), empty as never)).toEqual({ line1: '', line2: '', landmark: '', city: '', state: '', pincode: '', country: 'India' });
    expect(resolveBillingAddress(values(), { line1: 'x', country: '  ' } as never).country).toBe('India');
  });

  it('uses the typed address when same-as-main is off or no main address exists', () => {
    expect(resolveBillingAddress(values({ same_as_main: false, line1: ' typed ', country: '' }), { line1: 'main' } as never).line1).toBe('typed');
    expect(resolveBillingAddress(values({ line1: ' typed ', country: '' }), null)).toMatchObject({ line1: 'typed', country: 'India' });
  });
});

// Stable references: the hook re-prefills whenever the profile object changes.
const nameOnly = { first_name: 'Jane', last_name: null, address: null };
const blankLine = { first_name: 'A', address: { line1: ' ' } } as unknown as Parameters<typeof useCheckoutBillingForm>[0];
const noAddress = { first_name: 'A' };
const noSaved = { first_name: 'A', address: null };

describe('useCheckoutBillingForm', () => {
  const buyer = {
    first_name: 'Jane',
    last_name: 'Doe',
    email: 'j@x.com',
    phone_extension: '+44',
    phone_number: '700',
    address: { line1: '1 Main', line2: 'B', landmark: 'P', city: 'Pune', state: 'MH', pincode: '411001', country: 'India' },
  };

  it('prefills the form from the profile and defaults to same-as-main when an address is saved', () => {
    const { result } = renderHook(() => useCheckoutBillingForm(buyer));
    expect(result.current.getValues()).toMatchObject({
      full_name: 'Jane Doe',
      email: 'j@x.com',
      phone_extension: '+44',
      phone_number: '700',
      same_as_main: true,
      line1: '1 Main',
      city: 'Pune',
      country: 'India',
    });
    expect(result.current.hasMainAddress).toBe(true);
    expect(result.current.mainAddress).toEqual(buyer.address);
  });

  it('falls back to defaults for a profile with only a name', () => {
    const { result } = renderHook(() => useCheckoutBillingForm(nameOnly));
    expect(result.current.getValues()).toMatchObject({ full_name: 'Jane', email: '', phone_extension: '+91', phone_number: '', same_as_main: false, line1: '', country: 'India' });
    expect(result.current.hasMainAddress).toBe(false);
    expect(result.current.mainAddress).toBeNull();
  });

  it('falls back to empty address parts when the saved address lacks them', () => {
    const { result } = renderHook(() => useCheckoutBillingForm(blankLine));
    expect(result.current.getValues()).toMatchObject({ same_as_main: false, line2: '', landmark: '', city: '', state: '', pincode: '', country: 'India' });
  });

  it('falls back to empty values for a profile with no address object at all', () => {
    const { result } = renderHook(() => useCheckoutBillingForm(noAddress));
    expect(result.current.getValues()).toMatchObject({ same_as_main: false, line1: '', country: 'India' });
  });

  it('keeps what the buyer already typed when the profile arrives later', () => {
    const { result, rerender } = renderHook(({ me }) => useCheckoutBillingForm(me), { initialProps: { me: null as typeof buyer | null } });
    act(() =>
      result.current.reset({ ...checkoutDefaults, full_name: 'Typed', email: 't@x.com', phone_extension: '', phone_number: '9', line1: 'Typed St', line2: 'T2', landmark: 'TL', city: 'Goa', state: 'GA', pincode: '403001', country: 'Nepal' })
    );
    rerender({ me: buyer });
    expect(result.current.getValues()).toMatchObject({ full_name: 'Typed', email: 't@x.com', phone_number: '9', line1: 'Typed St', line2: 'T2', landmark: 'TL', city: 'Goa', state: 'GA', pincode: '403001', country: 'Nepal' });
  });

  it('uses the default extension and country when neither the form nor the profile has one', () => {
    const { result, rerender } = renderHook(({ me }) => useCheckoutBillingForm(me), { initialProps: { me: null as typeof noAddress | null } });
    act(() => result.current.reset({ ...checkoutDefaults, phone_extension: '', country: '' }));
    rerender({ me: noAddress });
    expect(result.current.getValues()).toMatchObject({ phone_extension: '+91', country: 'India' });
  });

  it('leaves the form untouched without a profile', () => {
    const { result } = renderHook(() => useCheckoutBillingForm(undefined));
    expect(result.current.getValues()).toEqual(checkoutDefaults);
  });

  it('saves a fresh address as the main one only when opted in, and never blocks payment when saving fails', async () => {
    const { result } = renderHook(() => useCheckoutBillingForm(noSaved));
    const typed: CheckoutForm = { ...checkoutDefaults, save_as_main: true, line1: ' 9 Road ', city: 'Pune', state: 'MH', pincode: '411001' };
    await act(async () => result.current.persistMainAddress({ ...typed, save_as_main: false }));
    await act(async () => result.current.persistMainAddress({ ...typed, line1: '  ' }));
    expect(h.updateProfile).not.toHaveBeenCalled();
    await act(async () => result.current.persistMainAddress(typed));
    expect(h.updateProfile).toHaveBeenCalledWith({ variables: { input: { address: expect.objectContaining({ line1: '9 Road', city: 'Pune' }) } } });
    h.updateProfile.mockRejectedValue(new Error('profile down'));
    await expect(result.current.persistMainAddress(typed)).resolves.toBeUndefined();
  });

  it('does not save an address when one is already on file', async () => {
    const { result } = renderHook(() => useCheckoutBillingForm(buyer));
    await act(async () => result.current.persistMainAddress({ ...checkoutDefaults, save_as_main: true, line1: 'New' }));
    expect(h.updateProfile).not.toHaveBeenCalled();
  });

  it('builds the form for both the delivery and the membership checkout', () => {
    const product = renderHook(() => useCheckoutBillingForm(null, true));
    const membership = renderHook(() => useCheckoutBillingForm(null, false));
    expect(product.result.current.getValues()).toEqual(checkoutDefaults);
    expect(membership.result.current.getValues()).toEqual(checkoutDefaults);
  });
});
