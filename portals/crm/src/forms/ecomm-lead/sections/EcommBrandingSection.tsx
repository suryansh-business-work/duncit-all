import { Stack } from '@mui/material';
import ImageUploadField from '../../fields/ImageUploadField';
import TagsField from '../../fields/TagsField';
import DynamicFieldsRenderer from '../../fields/DynamicFieldsRenderer';
import { useTranslation } from '@duncit/shell';

export default function EcommBrandingSection() {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.75}>
      <ImageUploadField
        name="profile_photo_url"
        label={t('crm.forms.brandSellerPhoto')}
        shape="circle"
        folder="crm/ecomm-photos"
        helperText={t('crm.forms.optionalPngJpgUpTo8mb')}
      />
      <TagsField name="tags" label={t('crm.forms.tagsLabels')} helperText={t('crm.forms.optionalFreeTextLabelsForFiltering')} />
      <DynamicFieldsRenderer entity="ECOMM_LEAD" name="dynamic_values_json" />
    </Stack>
  );
}
