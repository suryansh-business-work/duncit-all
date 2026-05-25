import { Stack } from '@mui/material';
import FormField from '../../FormField';
import SelectField from '../../fields/SelectField';
import FieldGrid from '../../fields/FieldGrid';
import type { CrmOptionGroup } from '../../../api/crm.types';

export default function HostBasicSection({ config }: { config: CrmOptionGroup }) {
  return (
    <Stack spacing={1.5}>
      <FieldGrid>
        <FormField name="host_name" label="Host Name" required size="small" />
        <SelectField name="host_type" label="Host Type" options={config.host_types} />
      </FieldGrid>
      <FormField name="organization_name" label="Organization / Community Name" size="small" />
    </Stack>
  );
}
