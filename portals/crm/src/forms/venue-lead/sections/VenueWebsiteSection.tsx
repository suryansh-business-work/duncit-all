import { Stack } from '@mui/material';
import { FormField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import FieldGrid from '../../fields/FieldGrid';
import SocialLinksField from '../../fields/SocialLinksField';

export default function VenueWebsiteSection() {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.5}>
      <FieldGrid>
        <FormField
          name="website"
          label={t('crm.common.website')}
          size="small"
          placeholder="https://example.com"
          hint={t('crm.forms.venueWebsiteHint')}
        />
        <FormField name="instagram_link" label={t('crm.common.instagram')} size="small" placeholder="https://instagram.com/…" />
      </FieldGrid>
      <SocialLinksField />
    </Stack>
  );
}
