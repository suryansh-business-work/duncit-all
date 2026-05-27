import { Stack } from '@mui/material';
import DynamicFieldsRenderer from '../../fields/DynamicFieldsRenderer';

export default function VenueDynamicSection() {
  return (
    <Stack spacing={1.5}>
      <DynamicFieldsRenderer entity="VENUE_LEAD" name="dynamic_values_json" />
    </Stack>
  );
}
