import { useQuery } from '@apollo/client/react';
import { showsWaitlist } from '@duncit/utils';
import { HEADER_STATIC } from '../../components/app-header/queries';
import { CityLaunchView } from '../../components/city-launch';
import type { LocationLike } from '../../utils/location-tree';
import HomePage from './HomePage';

interface Props {
  superCategorySlug: string;
  locationId: string;
  zoneName: string;
}

/**
 * Home for the selected city: its feed, or — for a city an admin has not
 * launched yet — its waitlist in the feed's place, under the same header. The
 * city list is the header's own query, already in the cache by the time a
 * city is selected. Native twin: HomeScreen.
 */
export default function HomeRoute({ superCategorySlug, locationId, zoneName }: Readonly<Props>) {
  const { data } = useQuery<{ locations?: LocationLike[] }>(HEADER_STATIC, { fetchPolicy: 'cache-first' });
  const selected = data?.locations?.find((location) => location.id === locationId);

  if (selected && showsWaitlist(selected)) {
    return <CityLaunchView locationId={selected.id} />;
  }
  return <HomePage superCategorySlug={superCategorySlug} locationId={locationId} zoneName={zoneName} />;
}
