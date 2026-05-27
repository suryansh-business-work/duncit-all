import { Stack } from '@mui/material';
import FormField from '../../FormField';

export default function HostWebsiteSection() {
  return (
    <Stack spacing={1.5}>
      <FormField
        name="website"
        label="Website"
        size="small"
        placeholder="https://example.com"
        hint="Host's personal or organization website."
      />
    </Stack>
  );
}
