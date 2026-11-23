import { FormField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';

export default function VenueWebsiteSection() {
  const { t } = useTranslation();
  return (
    <FormField
      name="website"
      label={t('crm.common.website')}
      size="small"
      placeholder="https://example.com"
      hint={t('crm.forms.venueWebsiteHint')}
    />
  );
}
