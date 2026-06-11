import { Stack } from '@mui/material';
import DynamicFieldsRenderer from '../../fields/DynamicFieldsRenderer';

export default function HostDynamicSection() {
  return (
    <Stack spacing={1.5}>
      <DynamicFieldsRenderer entity="HOST_LEAD" name="dynamic_values_json" />
    </Stack>
  );
}
