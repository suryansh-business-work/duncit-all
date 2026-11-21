import { Stack } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import ImageUploadField from '../../fields/ImageUploadField';
import TagsField from '../../fields/TagsField';
import DynamicFieldsRenderer from '../../fields/DynamicFieldsRenderer';
import type { ProspectLeadEntity } from '../../../api/crm.types';

const PHOTO_FOLDER: Record<ProspectLeadEntity, string> = {
  CREATOR_LEAD: 'crm/creator-photos',
  COMMUNITY_LEAD: 'crm/community-photos',
};

/** 5. Photo, Tags & Custom Fields — the admin-defined fields opted in for this kind. */
export default function ProspectBrandingSection({ entity }: Readonly<{ entity: ProspectLeadEntity }>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.75}>
      <ImageUploadField
        name="profile_photo_url"
        label={t('crm.prospectLeads.photo')}
        shape="circle"
        folder={PHOTO_FOLDER[entity]}
        helperText={t('crm.forms.optionalPngJpgUpTo8mb')}
      />
      <TagsField name="tags" label={t('crm.forms.tagsLabels')} helperText={t('crm.forms.optionalFreeTextLabelsForFiltering')} />
      <DynamicFieldsRenderer entity={entity} name="dynamic_values_json" />
    </Stack>
  );
}
