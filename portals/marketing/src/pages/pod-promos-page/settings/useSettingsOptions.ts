import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { POD_PROMO_OPTIONS, type PickOption } from '../queries';
import type { PromoSettingsOptions } from '../promo-settings-form';

interface OptionsData {
  socialAccounts: { id: string; name: string; platform: string }[];
  locations: { id: string; location_name: string }[];
  clubs: { id: string; club_name: string }[];
  categories: { id: string; name: string }[];
}

const byLabel = (a: PickOption, b: PickOption) => a.label.localeCompare(b.label);

/** The accounts, cities, clubs and categories the settings pick from, sorted by name. */
export function toSettingsOptions(data: OptionsData | undefined): PromoSettingsOptions {
  return {
    accounts: (data?.socialAccounts ?? []).map((a) => ({ id: a.id, label: `${a.name} (${a.platform})` })).sort(byLabel),
    cities: (data?.locations ?? []).map((l) => ({ id: l.id, label: l.location_name })).sort(byLabel),
    clubs: (data?.clubs ?? []).map((c) => ({ id: c.id, label: c.club_name })).sort(byLabel),
    categories: (data?.categories ?? []).map((c) => ({ id: c.id, label: c.name })).sort(byLabel),
  };
}

export function useSettingsOptions() {
  const { data, loading, error } = useQuery<OptionsData>(POD_PROMO_OPTIONS, { fetchPolicy: 'cache-first' });
  const options = useMemo(() => toSettingsOptions(data), [data]);
  return { options, loading, error };
}
