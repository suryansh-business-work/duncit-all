import { Stack } from '@mui/material';
import { FormField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import FieldGrid from '../../fields/FieldGrid';
import TagsField from '../../fields/TagsField';
import SelectField from '../../fields/SelectField';
import type { CrmOptionGroup } from '../../../api/crm.types';

/** 3. Size & Meetups — how big the community is, how often it meets and what it wants from Duncit. */
export default function CommunityDetailsSection({ config }: Readonly<{ config: CrmOptionGroup }>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.5}>
      <FieldGrid>
        <FormField name="member_count" label={t('crm.communityLeads.members')} size="small" />
        <SelectField name="meetup_frequency" label={t('crm.communityLeads.meetupFrequency')} options={config.frequencies} />
      </FieldGrid>
      <TagsField name="interests" label={t('crm.communityLeads.interests')} helperText={t('crm.communityLeads.interestsHint')} />
      <TagsField
        name="partnership_interests"
        label={t('crm.communityLeads.partnershipInterests')}
        helperText={t('crm.communityLeads.partnershipInterestsHint')}
      />
    </Stack>
  );
}
