import MultiSelectField from '../../fields/MultiSelectField';
import type { CrmOptionGroup } from '../../../api/crm.types';

export default function VenueSuitabilitySection({ config }: Readonly<{ config: CrmOptionGroup }>) {
  return <MultiSelectField name="event_suitability" label="Venue suitable for" options={config.venue_event_suitability} />;
}
