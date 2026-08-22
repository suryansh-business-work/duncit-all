import CheckboxGroupField from '../../fields/CheckboxGroupField';
import type { CrmOptionGroup } from '../../../api/crm.types';
import { useTranslation } from '@duncit/shell';

export default function VenueAmenitiesSection({ config }: Readonly<{ config: CrmOptionGroup }>) {
  const { t } = useTranslation();
  return <CheckboxGroupField name="amenities" label={t('crm.forms.amenitiesAvailableAtTheVenue')} options={config.amenities} />;
}
