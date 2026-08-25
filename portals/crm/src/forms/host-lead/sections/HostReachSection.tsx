import { Stack } from '@mui/material';
import { FormField } from '@duncit/forms';
import SwitchField from '../../fields/SwitchField';
import FieldGrid from '../../fields/FieldGrid';
import { useTranslation } from '@duncit/shell';

export default function HostReachSection() {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.5}>
      <FieldGrid>
        <FormField name="instagram_link" label={t('crm.forms.instagramSocialLink')} size="small" />
        <FormField name="community_link" label={t('crm.forms.whatsappCommunityGroupLink')} size="small" />
      </FieldGrid>
      <FieldGrid cols={3}>
        <FormField name="community_size" label={t('crm.forms.communitySize')} size="small" slotProps={{ htmlInput: { inputMode: 'numeric' } }} />
        <FormField name="past_attendees" label={t('crm.forms.approxPastAttendees')} size="small" slotProps={{ htmlInput: { inputMode: 'numeric' } }} />
        <SwitchField name="previous_events_hosted" label={t('crm.forms.previousEventsHosted')} />
      </FieldGrid>
    </Stack>
  );
}
