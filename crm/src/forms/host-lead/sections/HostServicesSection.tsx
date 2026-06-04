import { Divider, Stack, Typography } from '@mui/material';
import ServicesOfferedPicker from '../../fields/ServicesOfferedPicker';
import ServicesField from '../../fields/ServicesField';
import type { CrmOptionGroup } from '../../../api/crm.types';

export default function HostServicesSection({ config }: { config: CrmOptionGroup }) {
  return (
    <Stack spacing={1.5}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.4 }}>
        FROM CATALOGUE · auto-loaded from the Super/Category/Sub you picked
      </Typography>
      <ServicesOfferedPicker />
      <Divider flexItem />
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.4 }}>
        DETAILS · add a name / description per service
      </Typography>
      <ServicesField name="services_offered" options={config.host_services_offered_options} />
    </Stack>
  );
}
