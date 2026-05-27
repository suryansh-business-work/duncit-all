import { Stack } from '@mui/material';
import ServicesField from '../../fields/ServicesField';
import type { CrmOptionGroup } from '../../../api/crm.types';

export default function HostServicesSection({ config }: { config: CrmOptionGroup }) {
  return (
    <Stack spacing={1.5}>
      <ServicesField
        name="services_offered"
        options={config.host_services_offered_options}
      />
    </Stack>
  );
}
