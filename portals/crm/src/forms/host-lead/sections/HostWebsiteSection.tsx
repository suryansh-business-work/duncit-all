import { Stack } from '@mui/material';
import { FormField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';

export default function HostWebsiteSection() {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.5}>
      <FormField
        name="website"
        label={t('crm.common.website')}
        size="small"
        placeholder="https://example.com"
        hint="Host's personal or organization website."
      />
    </Stack>
  );
}
