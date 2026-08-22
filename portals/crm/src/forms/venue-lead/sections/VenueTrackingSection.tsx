import { Stack } from '@mui/material';
import { FormField } from '@duncit/forms';
import SelectField from '../../fields/SelectField';
import DateField from '../../fields/DateField';
import FieldGrid from '../../fields/FieldGrid';
import type { CrmOptionGroup } from '../../../api/crm.types';
import { useTranslation } from '@duncit/shell';

export default function VenueTrackingSection({ config }: Readonly<{ config: CrmOptionGroup }>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.5}>
      <FieldGrid>
        <SelectField name="lead_source" label={t('crm.forms.leadSource')} options={config.lead_sources} />
        <FormField name="assigned_to" label={t('crm.forms.assignedTo')} size="small" />
      </FieldGrid>
      <FieldGrid cols={3}>
        <SelectField name="lead_status" label={t('crm.forms.leadStatus')} options={config.venue_lead_statuses} required allowEmpty={false} />
        <SelectField name="priority" label={t('crm.common.priority')} options={config.priorities} required allowEmpty={false} />
        <DateField name="next_follow_up_date" label={t('crm.forms.nextFollowUpDate')} />
      </FieldGrid>
      <FormField name="remarks" label={t('crm.forms.remarks')} size="small" multiline minRows={2} />
    </Stack>
  );
}
