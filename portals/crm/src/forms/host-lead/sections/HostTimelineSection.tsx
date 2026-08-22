import { Stack } from '@mui/material';
import { FormField } from '@duncit/forms';
import SelectField from '../../fields/SelectField';
import DateField from '../../fields/DateField';
import FieldGrid from '../../fields/FieldGrid';
import type { CrmOptionGroup } from '../../../api/crm.types';
import { useTranslation } from '@duncit/shell';

export default function HostTimelineSection({ config }: Readonly<{ config: CrmOptionGroup }>) {
  const { t } = useTranslation();
  return (
    <FieldGrid cols={3}>
      <DateField name="preferred_event_date" label={t('crm.forms.preferredEventDate')} />
      <SelectField name="preferred_day" label={t('crm.forms.preferredDay')} options={config.week_days} />
      <Stack><FormField name="preferred_time_slot" label={t('crm.forms.preferredTimeSlot')} size="small" /></Stack>
    </FieldGrid>
  );
}
