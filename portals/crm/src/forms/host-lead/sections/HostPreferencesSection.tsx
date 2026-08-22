import { Stack } from '@mui/material';
import SelectField from '../../fields/SelectField';
import MultiSelectField from '../../fields/MultiSelectField';
import FieldGrid from '../../fields/FieldGrid';
import type { CrmOptionGroup } from '../../../api/crm.types';
import { useTranslation } from '@duncit/shell';

export default function HostPreferencesSection({ config }: Readonly<{ config: CrmOptionGroup }>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.5}>
      <MultiSelectField name="interests" label={t('crm.forms.interestedInHosting')} options={config.host_interests} />
      <FieldGrid>
        <SelectField name="expected_audience_size" label={t('crm.forms.expectedAudienceSize')} options={config.audience_sizes} />
        <SelectField name="frequency" label={t('crm.common.frequency')} options={config.frequencies} />
      </FieldGrid>
    </Stack>
  );
}
