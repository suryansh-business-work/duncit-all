import CheckboxGroupField from '../../fields/CheckboxGroupField';
import type { CrmOptionGroup } from '../../../api/crm.types';

export default function VenueAmenitiesSection({ config }: { config: CrmOptionGroup }) {
  return <CheckboxGroupField name="amenities" label="Amenities available at the venue" options={config.amenities} />;
}
