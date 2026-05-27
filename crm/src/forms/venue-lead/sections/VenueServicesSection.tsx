import { Stack } from '@mui/material';
import ServicesField from '../../fields/ServicesField';
import type { CrmOptionGroup } from '../../../api/crm.types';

export default function VenueServicesSection({ config }: { config: CrmOptionGroup }) {
  return (
    <Stack spacing={1.5}>
      <ServicesField
        name="services_offered"
        options={config.venue_services_offered_options}
      />
    </Stack>
  );
}
