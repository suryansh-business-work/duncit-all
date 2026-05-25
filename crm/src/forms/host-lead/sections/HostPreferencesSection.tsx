import { Stack } from '@mui/material';
import SelectField from '../../fields/SelectField';
import MultiSelectField from '../../fields/MultiSelectField';
import FieldGrid from '../../fields/FieldGrid';
import type { CrmOptionGroup } from '../../../api/crm.types';

export default function HostPreferencesSection({ config }: { config: CrmOptionGroup }) {
  return (
    <Stack spacing={1.5}>
      <MultiSelectField name="interests" label="Interested In Hosting" options={config.host_interests} />
      <FieldGrid>
        <SelectField name="expected_audience_size" label="Expected Audience Size" options={config.audience_sizes} />
        <SelectField name="frequency" label="Frequency" options={config.frequencies} />
      </FieldGrid>
    </Stack>
  );
}
