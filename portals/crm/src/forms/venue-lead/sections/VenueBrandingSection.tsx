import { Stack } from '@mui/material';
import ImageUploadField from '../../fields/ImageUploadField';
import TagsField from '../../fields/TagsField';
import { useTranslation } from '@duncit/shell';

export default function VenueBrandingSection() {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.75}>
      <ImageUploadField
        name="logo_url"
        label={t('crm.forms.venueLogo')}
        shape="square"
        folder="crm/venue-logos"
        helperText={t('crm.forms.optionalPngJpgUpTo8mb')}
      />
      <TagsField name="tags" label={t('crm.forms.tagsLabels')} helperText={t('crm.forms.optionalFreeTextLabelsForFiltering')} />
    </Stack>
  );
}
