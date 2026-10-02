import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import { MediaCropDialog } from '@/components/media-crop/MediaCropDialog';
import { AiMonitoringChip } from '@/components/ai-monitoring';
import type { useMediaUpload } from '@/hooks/useMediaUpload';
import type { MobileUploadSettings } from '@/hooks/useUploadSettings';
import { fireAndForget } from '@/utils/fire-and-forget';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

type ReviewUpload = ReturnType<typeof useMediaUpload>;

/** Photo attachments for the write-review form: the staged thumbnails, the
 * picker trigger and the crop/upload dialog. */
export function ReviewPhotos({
  images,
  upload,
  settings,
  accent,
}: Readonly<{
  images: string[];
  upload: ReviewUpload;
  settings: MobileUploadSettings | null;
  accent: string;
}>) {
  const { t } = useTranslation();
  const uploadBusy = upload.uploading;
  return (
    <>
      {images.length > 0 ? (
        <XStack gap={6}>
          {images.map((u) => (
            <AppImage
              key={u}
              source={{ uri: u }}
              accessibilityLabel={t('mweb.podDetails.review')}
              style={{ width: 56, height: 56, borderRadius: 8 }}
            />
          ))}
        </XStack>
      ) : null}
      <XStack
        pressStyle={PRESS_STYLE.surface}
        testID="review-add-photo"
        role="button"
        tabIndex={0}
        onPress={uploadBusy ? undefined : () => fireAndForget(upload.pick())}
        alignItems="center"
        gap={6}
        opacity={uploadBusy ? 0.6 : 1}
      >
        <MaterialIcons name="add-photo-alternate" size={18} color={accent} />
        <Text fontSize={13} fontWeight="700" color={accent}>
          {uploadBusy ? 'Uploading…' : 'Add photo'}
        </Text>
      </XStack>
      <XStack>
        <AiMonitoringChip testID="review-ai-monitoring" />
      </XStack>
      <MediaCropDialog
        media={upload.pending}
        settings={settings}
        uploading={upload.uploading}
        stage={upload.stage}
        progress={upload.progress}
        error={upload.error}
        onConfirm={upload.confirm}
        onCancel={upload.cancel}
      />
    </>
  );
}
