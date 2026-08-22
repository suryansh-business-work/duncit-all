import { Stack } from '@mui/material';
import { FormField } from '@duncit/forms';
import SelectField from '../../fields/SelectField';
import MultiSelectField from '../../fields/MultiSelectField';
import FieldGrid from '../../fields/FieldGrid';
import type { CrmOptionGroup } from '../../../api/crm.types';
import { useTranslation } from '@duncit/shell';

export default function VenueAvailabilitySection({ config }: Readonly<{ config: CrmOptionGroup }>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.5}>
      <MultiSelectField name="available_days" label={t('crm.forms.availableDays')} options={config.week_days} />
      <FieldGrid>
        <FormField name="available_time_slots" label={t('crm.forms.availableTimeSlots')} size="small" />
        <SelectField name="booking_notice" label={t('crm.forms.bookingNoticeRequired')} options={config.booking_notices} />
      </FieldGrid>
    </Stack>
  );
}
