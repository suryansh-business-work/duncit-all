import { Stack } from '@mui/material';
import { FormField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import FieldGrid from '../../fields/FieldGrid';
import TagsField from '../../fields/TagsField';
import MultiSelectField from '../../fields/MultiSelectField';
import type { CrmOptionGroup } from '../../../api/crm.types';

/** 3. Reach & Collaboration — audience size, content and how they work with brands. */
export default function CreatorReachSection({ config }: Readonly<{ config: CrmOptionGroup }>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.5}>
      <TagsField name="niches" label={t('crm.creatorLeads.niches')} helperText={t('crm.creatorLeads.nichesHint')} />
      <FieldGrid>
        <FormField name="followers_count" label={t('crm.creatorLeads.followers')} size="small" />
        <FormField
          name="engagement_rate"
          label={t('crm.creatorLeads.engagementRate')}
          size="small"
          hint={t('crm.creatorLeads.engagementHint')}
        />
      </FieldGrid>
      <TagsField
        name="profile_links"
        label={t('crm.creatorLeads.profileLinks')}
        helperText={t('crm.creatorLeads.profileLinksHint')}
      />
      <MultiSelectField
        name="collaboration_types"
        label={t('crm.creatorLeads.collaborationTypes')}
        options={config.collaboration_types}
      />
      <FormField
        name="rate_card"
        label={t('crm.creatorLeads.rateCard')}
        size="small"
        multiline
        minRows={2}
        hint={t('crm.creatorLeads.rateCardHint')}
      />
    </Stack>
  );
}
