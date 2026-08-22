import MultiSelectField from '../../fields/MultiSelectField';
import type { CrmOptionGroup } from '../../../api/crm.types';
import { useTranslation } from '@duncit/shell';

export default function VenueSuitabilitySection({ config }: Readonly<{ config: CrmOptionGroup }>) {
  const { t } = useTranslation();
  return <MultiSelectField name="event_suitability" label={t('crm.forms.venueSuitableFor')} options={config.venue_event_suitability} />;
}
