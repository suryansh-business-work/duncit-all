import { Stack } from '@mui/material';
import { FormField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import FieldGrid from '../../fields/FieldGrid';
import SuperCategoryField from '../../fields/SuperCategoryField';
import SelectField from '../../fields/SelectField';
import { LocationFieldset } from '../../fields/LocationField';
import type { CrmOptionGroup } from '../../../api/crm.types';

/** 1. Profile — what the community is, where it lives online and where it meets. */
export default function CommunityProfileSection({ config }: Readonly<{ config: CrmOptionGroup }>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.5}>
      <SuperCategoryField
        name="super_category_id"
        label={t('crm.common.superCategory')}
        required
        hint={t('crm.communityLeads.superCategoryHint')}
      />
      <FormField name="community_name" label={t('crm.communityLeads.communityName')} required size="small" />
      <FieldGrid>
        <SelectField name="community_type" label={t('crm.communityLeads.communityType')} options={config.community_types} />
        <SelectField name="platform" label={t('crm.communityLeads.platform')} options={config.community_platforms} />
      </FieldGrid>
      <FormField
        name="community_link"
        label={t('crm.communityLeads.communityLink')}
        size="small"
        hint={t('crm.communityLeads.communityLinkHint')}
      />
      <LocationFieldset required={false} />
    </Stack>
  );
}
