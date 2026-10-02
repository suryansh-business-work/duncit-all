import { useQuery } from '@apollo/client/react';
import { useLocation } from 'react-router';
import { showsWaitlist } from '@duncit/utils';
import { HEADER_STATIC } from '../app-header/queries';
import type { LocationLike } from '../../utils/location-tree';

const CITY_LAUNCH_PATH = '/city-launch/';

/**
 * Whether the selected city is not launched yet — Home then shows its
 * waitlist in the feed's place. The city list is the header's own query,
 * already in the cache by the time a city is selected.
 */
export function useWaitlistCity(locationId: string): boolean {
  const { data } = useQuery<{ locations?: LocationLike[] }>(HEADER_STATIC, {
    fetchPolicy: 'cache-first',
    skip: !locationId,
  });
  const selected = data?.locations?.find((location) => location.id === locationId);
  return !!selected && showsWaitlist(selected);
}

/**
 * Whether the current page is a "Coming soon" city page — Home over a
 * waitlisted city, or a city's own /city-launch link. The shell drops the
 * bottom nav and the header its super-category switch there: neither leads
 * anywhere until the city launches. Native twin: useComingSoonCity.
 */
export function useComingSoonPage(locationId: string): boolean {
  const { pathname } = useLocation();
  const waitlisted = useWaitlistCity(locationId);
  return pathname.startsWith(CITY_LAUNCH_PATH) || (pathname === '/' && waitlisted);
}
