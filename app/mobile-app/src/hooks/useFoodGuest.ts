import { useEffect, useMemo, useState } from 'react';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { foodCheckoutDefaults, type FoodCheckoutValues } from '@duncit/forms/schemas';
import { PHONE_NUMBER } from '@duncit/regex';
import { foodTableFromParam } from '@duncit/utils';

import type { RootStackParamList } from '@/navigation/types';
import { readFoodGuest, type FoodGuestDetails } from '@/services/food-storage';
import { useMeStore } from '@/stores/me.store';
import { fireAndForget } from '@/utils/fire-and-forget';

/**
 * Who is ordering, as far as it is already known: the signed-in account's name
 * and mobile, else what this device last ordered with. The account is the user
 * info already in the store — opening a menu does not ask for it again. A guest
 * who scanned a table sticker (`?table=5`) starts with that table filled in.
 * RN twin of mWeb's food/useFoodGuest.
 */
export function useFoodGuest(): FoodCheckoutValues {
  const me = useMeStore((s) => s.data?.me ?? null);
  const [saved, setSaved] = useState<FoodGuestDetails | null>(null);
  const table = foodTableFromParam(
    useRoute<RouteProp<RootStackParamList, 'VenueDetails'>>().params?.table,
  );

  useEffect(() => {
    let active = true;
    fireAndForget(
      readFoodGuest().then((guest) => {
        if (active) setSaved(guest);
      }),
    );
    return () => {
      active = false;
    };
  }, []);

  return useMemo(() => {
    const accountName = [me?.first_name, me?.last_name].filter(Boolean).join(' ').trim();
    const accountPhone = me?.phone_number ?? '';
    return {
      ...foodCheckoutDefaults,
      name: accountName || saved?.name || '',
      // An account's number from another country is not one this form can take.
      phone: PHONE_NUMBER.test(accountPhone) ? accountPhone : (saved?.phone ?? ''),
      table,
    };
  }, [me, saved, table]);
}
