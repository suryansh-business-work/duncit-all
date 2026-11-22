import { Stack } from '@mui/material';
import { FormField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import FieldGrid from '../../fields/FieldGrid';
import SuperCategoryField from '../../fields/SuperCategoryField';
import SelectField from '../../fields/SelectField';
import { LocationFieldset } from '../../fields/LocationField';
import type { CrmOptionGroup } from '../../../api/crm.types';

/** 1. Profile — who the creator is and where they are based. */
export default function CreatorProfileSection({ config }: Readonly<{ config: CrmOptionGroup }>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.5}>
      <SuperCategoryField
        name="super_category_id"
        label={t('crm.common.superCategory')}
        required
        hint={t('crm.creatorLeads.superCategoryHint')}
      />
      <FieldGrid>
        <FormField name="creator_name" label={t('crm.creatorLeads.creatorName')} required size="small" />
        <FormField name="handle" label={t('crm.creatorLeads.handle')} size="small" hint={t('crm.creatorLeads.handleHint')} />
      </FieldGrid>
      <SelectField name="primary_platform" label={t('crm.creatorLeads.primaryPlatform')} options={config.creator_platforms} />
      <LocationFieldset required={false} />
    </Stack>
  );
}
