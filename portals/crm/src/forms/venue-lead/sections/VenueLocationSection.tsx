import { Stack } from '@mui/material';
import { FormField } from '@duncit/forms';
import FieldGrid from '../../fields/FieldGrid';
import { LocationFieldset } from '../../fields/LocationField';
import { useTranslation } from '@duncit/shell';

export default function VenueLocationSection() {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.5}>
      <LocationFieldset required />
      <FormField name="full_address" label={t('crm.forms.fullAddress')} required size="small" multiline minRows={2} />
      <FieldGrid>
        <FormField name="landmark" label={t('crm.common.landmark')} size="small" />
        <FormField name="map_link" label={t('crm.forms.googleMapsLinkCoordinates')} size="small" />
      </FieldGrid>
    </Stack>
  );
}
