import { Stack } from '@mui/material';
import { FormField } from '@duncit/forms';
import FieldGrid from '../../fields/FieldGrid';
import SwitchField from '../../fields/SwitchField';
import TagsField from '../../fields/TagsField';
import { useTranslation } from '@duncit/shell';

export default function EcommPresenceSection() {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.5}>
      <FieldGrid>
        <FormField name="gst_number" label={t('crm.forms.gstNumber')} size="small" />
        <SwitchField name="gst_applicable" label={t('crm.common.gstApplicable')} />
      </FieldGrid>
      <FieldGrid>
        <FormField name="website" label={t('crm.common.website')} size="small" placeholder="https://example.com" />
        <FormField name="instagram_link" label={t('crm.common.instagram')} size="small" placeholder="https://instagram.com/…" />
      </FieldGrid>
      <TagsField
        name="marketplace_links"
        label={t('crm.forms.marketplaceLinks')}
        helperText={t('crm.forms.amazonFlipkartMeeshoStoreLinksPress')}
      />
    </Stack>
  );
}
