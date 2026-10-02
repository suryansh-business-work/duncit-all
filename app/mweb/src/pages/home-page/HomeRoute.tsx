import { CityLaunchView, useWaitlistCity } from '../../components/city-launch';
import HomePage from './HomePage';

interface Props {
  superCategorySlug: string;
  locationId: string;
  zoneName: string;
}

/**
 * Home for the selected city: its feed, or — for a city an admin has not
 * launched yet — its waitlist in the feed's place, under the same header.
 * Native twin: HomeScreen.
 */
export default function HomeRoute({ superCategorySlug, locationId, zoneName }: Readonly<Props>) {
  const waitlisted = useWaitlistCity(locationId);
  if (waitlisted) {
    return <CityLaunchView locationId={locationId} />;
  }
  return <HomePage superCategorySlug={superCategorySlug} locationId={locationId} zoneName={zoneName} />;
}
