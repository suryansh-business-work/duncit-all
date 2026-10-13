import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { PHONE_NUMBER } from '@duncit/regex';
import { CHECKOUT_ME } from '../../checkout-page/queries';
import { foodCheckoutDefaults, type FoodCheckoutValues } from './food-checkout';
import { readFoodGuest } from './foodStorage';

interface Me {
  first_name?: string | null;
  last_name?: string | null;
  phone_number?: string | null;
}

/**
 * Who is ordering, as far as it is already known: the signed-in account's name
 * and mobile, else what this device last ordered with. A signed-out guest is
 * never asked the server who they are — the query is skipped without a token.
 */
export function useFoodGuest(): FoodCheckoutValues {
  const signedIn = useMemo(() => {
    try {
      return !!localStorage.getItem('token');
    } catch {
      // Storage blocked: the guest is treated as signed out and types their details.
      return false;
    }
  }, []);
  // USER_INFO already holds these fields, so a signed-in read answers from the cache.
  const { data } = useQuery<{ me: Me | null }>(CHECKOUT_ME, { fetchPolicy: 'cache-first', skip: !signedIn });
  const me = data?.me;

  return useMemo(() => {
    const saved = readFoodGuest();
    const accountName = [me?.first_name, me?.last_name].filter(Boolean).join(' ').trim();
    const accountPhone = me?.phone_number ?? '';
    return {
      ...foodCheckoutDefaults,
      name: accountName || saved?.name || '',
      // An account's number from another country is not one this form can take.
      phone: PHONE_NUMBER.test(accountPhone) ? accountPhone : (saved?.phone ?? ''),
    };
  }, [me]);
}
