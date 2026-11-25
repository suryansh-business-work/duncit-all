import { useMemo } from 'react';

import type { ChoiceOption } from '@/components/ChoiceField';
import { CrmAppNearbyLocationsDocument } from '@/graphql/leadLists';
import { useGqlQuery } from '@/hooks/useGqlQuery';

const NO_VARS = {};

type LocationDoc = {
  city?: string | null;
  location_zones?: { zone_name?: string | null }[] | null;
};

const byLabel = (a: ChoiceOption, b: ChoiceOption) => a.label.localeCompare(b.label);
const asOptions = (values: Iterable<string>) =>
  [...values].map((value) => ({ value, label: value })).sort(byLabel);

/** The admin-managed cities, once each, A–Z (the portal's strict city picker). */
export function cityChoices(locations: readonly LocationDoc[]): ChoiceOption[] {
  return asOptions(new Set(locations.map((loc) => loc.city ?? '').filter(Boolean)));
}

/** The picked city's zones (areas/localities), A–Z. */
export function areaChoices(locations: readonly LocationDoc[], city: string): ChoiceOption[] {
  const zones = locations
    .filter((loc) => city && loc.city === city)
    .flatMap((loc) => (loc.location_zones ?? []).map((zone) => zone.zone_name ?? ''))
    .filter(Boolean);
  return asOptions(new Set(zones));
}

/** Nearby leads › a city or area: the admin Location list the portal's city and area pickers read. */
export function useNearbyPlaces(city: string, fallbackError: string) {
  const { data, loading, error, refetch } = useGqlQuery(CrmAppNearbyLocationsDocument, NO_VARS, {
    fallbackError,
  });
  const locations = data?.locations;
  const cities = useMemo(() => cityChoices(locations ?? []), [locations]);
  const areas = useMemo(() => areaChoices(locations ?? [], city), [locations, city]);
  return { cities, areas, loading, error, refetch };
}
