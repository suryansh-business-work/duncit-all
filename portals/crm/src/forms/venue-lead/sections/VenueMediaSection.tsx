import { Stack } from '@mui/material';
import { FormField } from '@duncit/forms';
import MediaUploadField from '../../fields/MediaUploadField';
import { useTranslation } from '@duncit/shell';

export default function VenueMediaSection() {
  const { t } = useTranslation();
  return (
    <Stack spacing={2}>
      <MediaUploadField
        name="photos"
        label={t('crm.forms.venuePhotos')}
        kind="image"
        folder="crm/venue-photos"
        helperText={t('crm.forms.uploadToImagekitJpgPngUp')}
      />
      <MediaUploadField
        name="videos"
        label={t('crm.forms.venueVideos')}
        kind="video"
        folder="crm/venue-videos"
        helperText={t('crm.forms.uploadToImagekitMp4UpTo')}
      />
      <FormField name="brochure_url" label={t('crm.forms.brochureRateCardUrl')} size="small" />
    </Stack>
  );
}
