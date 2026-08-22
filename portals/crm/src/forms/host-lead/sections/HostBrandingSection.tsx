import { Stack } from '@mui/material';
import ImageUploadField from '../../fields/ImageUploadField';
import TagsField from '../../fields/TagsField';
import { useTranslation } from '@duncit/shell';

export default function HostBrandingSection() {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.75}>
      <ImageUploadField
        name="profile_photo_url"
        label={t('crm.forms.profilePhoto')}
        shape="circle"
        folder="crm/host-photos"
        helperText={t('crm.forms.optionalPngJpgUpTo8mb')}
      />
      <TagsField name="tags" label={t('crm.forms.tagsLabels')} helperText={t('crm.forms.optionalFreeTextLabelsForFiltering')} />
    </Stack>
  );
}
