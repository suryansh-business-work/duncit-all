import { useEffect, useMemo } from 'react';
import { useMutation } from '@apollo/client/react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  makeCheckoutSchema,
  makeProductCheckoutSchema,
  checkoutDefaults,
  resolveBillingAddress,
  shouldPersistMainAddress,
} from './checkout';
import { useTranslation } from '../../i18n/useTranslation';
import { UPDATE_MY_PROFILE, type CheckoutForm } from './queries';
import type { PostalAddressParts } from './checkout';

/** The CHECKOUT_ME fields the form is prefilled from. */
export interface CheckoutBuyer {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone_extension?: string | null;
  phone_number?: string | null;
  address?: PostalAddressParts | null;
}

/**
 * The contact + billing form every checkout sends with its payment — the server
 * refuses any payment without a billing address, because each one is invoiced.
 * Builds the RHF + Zod form, prefills it from the buyer's profile (`me`, the
 * CHECKOUT_ME shape) and offers the best-effort "save as my main address".
 */
export function useCheckoutBillingForm(me: CheckoutBuyer | null | undefined, requireAddress = false) {
  const { t } = useTranslation();
  const [doUpdateProfile] = useMutation(UPDATE_MY_PROFILE);

  // The schemas cannot call `t` at module scope, so they are built here from the
  // reader's own catalogue — the validation messages are copy like any other.
  const schema = useMemo(
    () => (requireAddress ? makeProductCheckoutSchema(t) : makeCheckoutSchema(t)),
    [requireAddress, t],
  );

  const { control, handleSubmit, getValues, reset } = useForm<CheckoutForm, unknown, CheckoutForm>({
    defaultValues: checkoutDefaults,
    resolver: zodResolver(schema) as unknown as Resolver<CheckoutForm, unknown, CheckoutForm>,
    mode: 'onTouched',
  });

  const mainAddress = me?.address ?? null;
  const hasMainAddress = !!mainAddress?.line1?.trim();

  // Best-effort: persist the entered billing address as the main address when the
  // buyer opts in. Never blocks or fails checkout if the profile save errors.
  const persistMainAddress = async (values: CheckoutForm) => {
    if (!shouldPersistMainAddress(values, hasMainAddress)) return;
    try {
      await doUpdateProfile({ variables: { input: { address: resolveBillingAddress(values, null) } } });
    } catch {
      // Saving the main address is best-effort — ignore so payment still proceeds.
    }
  };

  useEffect(() => {
    if (!me) return;
    const prev = getValues();
    const addr: Partial<PostalAddressParts> = me.address ?? {};
    const savedMainAddress = !!addr.line1?.trim();
    const fullName = [me.first_name, me.last_name].filter(Boolean).join(' ').trim();
    reset({
      ...prev,
      full_name: prev.full_name || fullName,
      email: prev.email || me.email || '',
      phone_extension: prev.phone_extension || me.phone_extension || '+91',
      phone_number: prev.phone_number || me.phone_number || '',
      same_as_main: savedMainAddress,
      line1: prev.line1 || addr.line1 || '',
      line2: prev.line2 || addr.line2 || '',
      landmark: prev.landmark || addr.landmark || '',
      city: prev.city || addr.city || '',
      state: prev.state || addr.state || '',
      pincode: prev.pincode || addr.pincode || '',
      country: prev.country || addr.country || 'India',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  return { control, handleSubmit, getValues, reset, mainAddress, hasMainAddress, persistMainAddress };
}
