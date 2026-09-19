import { Box, FormHelperText, Stack, Typography } from '@mui/material';
import { Controller, type Control } from 'react-hook-form';
import { AttachmentUploadField, SingleImageUploadField } from '@duncit/media-picker';
import { useTranslation } from '@duncit/shell';
import { LISTING_LIMITS, type StoreListingValues } from './store-listing.types';

/** Where the listing images land on ImageKit. The server fetches them from there on a push. */
const FOLDER = '/store-listing';
const ACCEPT = 'image/png,image/jpeg';

type ListField =
  | 'iphone_screenshots'
  | 'ipad_screenshots'
  | 'android_phone_screenshots'
  | 'android_tablet_7_screenshots'
  | 'android_tablet_10_screenshots';
type ImageField = 'android_feature_graphic' | 'android_icon';

interface ListProps {
  control: Control<StoreListingValues>;
  name: ListField;
  label: string;
  hint: string;
  max: number;
}

/** An ordered set of screenshots. The order here is the order on the store. */
function ImageListField({ control, name, label, hint, max }: Readonly<ListProps>) {
  const { t } = useTranslation();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Box data-testid={`store-listing-${name.replaceAll('_', '-')}`}>
          <AttachmentUploadField
            value={field.value}
            onChange={field.onChange}
            folder={FOLDER}
            max={max}
            label={label}
            accept={ACCEPT}
            surface="PORTALS"
            buttonLabel={t('tech.storeListing.upload')}
          />
          <FormHelperText error={!!fieldState.error}>{fieldState.error?.message ?? hint}</FormHelperText>
        </Box>
      )}
    />
  );
}

interface SingleProps {
  control: Control<StoreListingValues>;
  name: ImageField;
  label: string;
  hint: string;
}

function ImageField({ control, name, label, hint }: Readonly<SingleProps>) {
  const { t } = useTranslation();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Box data-testid={`store-listing-${name.replaceAll('_', '-')}`}>
          <SingleImageUploadField
            value={field.value}
            onChange={field.onChange}
            folder={FOLDER}
            label={label}
            accept={ACCEPT}
            surface="PORTALS"
            error={!!fieldState.error}
            helperText={fieldState.error?.message ?? hint}
            buttonLabel={t('tech.storeListing.upload')}
          />
        </Box>
      )}
    />
  );
}

/** Apple's two required sets, then everything Google Play shows. */
export default function ScreenshotFields({ control }: Readonly<{ control: Control<StoreListingValues> }>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={2.5} data-testid="store-listing-screenshots">
      <Typography variant="subtitle2">{t('tech.storeListing.sectionApple')}</Typography>
      <ImageListField
        control={control}
        name="iphone_screenshots"
        label={t('tech.storeListing.iphoneScreenshots')}
        hint={t('tech.storeListing.iphoneScreenshotsHint')}
        max={LISTING_LIMITS.screenshots}
      />
      <ImageListField
        control={control}
        name="ipad_screenshots"
        label={t('tech.storeListing.ipadScreenshots')}
        hint={t('tech.storeListing.ipadScreenshotsHint')}
        max={LISTING_LIMITS.screenshots}
      />
      <Typography variant="subtitle2">{t('tech.storeListing.sectionPlay')}</Typography>
      <ImageListField
        control={control}
        name="android_phone_screenshots"
        label={t('tech.storeListing.androidPhoneScreenshots')}
        hint={t('tech.storeListing.androidPhoneScreenshotsHint')}
        max={LISTING_LIMITS.play_screenshots}
      />
      <ImageListField
        control={control}
        name="android_tablet_7_screenshots"
        label={t('tech.storeListing.androidTablet7Screenshots')}
        hint={t('tech.storeListing.androidTabletHint')}
        max={LISTING_LIMITS.play_screenshots}
      />
      <ImageListField
        control={control}
        name="android_tablet_10_screenshots"
        label={t('tech.storeListing.androidTablet10Screenshots')}
        hint={t('tech.storeListing.androidTabletHint')}
        max={LISTING_LIMITS.play_screenshots}
      />
      <ImageField
        control={control}
        name="android_feature_graphic"
        label={t('tech.storeListing.androidFeatureGraphic')}
        hint={t('tech.storeListing.androidFeatureGraphicHint')}
      />
      <ImageField
        control={control}
        name="android_icon"
        label={t('tech.storeListing.androidIcon')}
        hint={t('tech.storeListing.androidIconHint')}
      />
    </Stack>
  );
}
