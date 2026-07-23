import { AppImage } from '@/components/AppImage';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { MediaCropDialog } from '@/components/media-crop/MediaCropDialog';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useUploadSettings } from '@/hooks/useUploadSettings';

const VIDEO_URL_RE = /\.(mp4|mov|webm)$/i;

const splitLines = (text: string) =>
  text
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

/** Formats + size hint sourced from admin Upload Settings (no hardcoded copy). */
function uploadHint(formats: string[] | undefined, maxImageMb: number | undefined): string {
  if (!formats?.length || !maxImageMb) return 'Crop after selecting';
  const list = formats.map((f) => f.toUpperCase()).join(', ');
  return `${list} · up to ${maxImageMb} MB · crop after selecting`;
}

interface Props {
  value: string;
  onChange: (text: string) => void;
  error?: string;
  label?: string;
  folder?: string;
}

/** Pod media — upload from the library into a thumbnail list (URLs serialize
 * into media_text). Upload-only (no raw URL box). Mirrors mWeb's MediaUrlsField. */
export function MediaUploadField({
  value,
  onChange,
  error,
  label = 'Cover image (at least one image)',
  folder = '/pods',
}: Readonly<Props>) {
  const { muted, primary } = useThemeColors();
  const urls = splitLines(value ?? '');
  const settings = useUploadSettings();
  const addUrl = (url: string) => onChange([...urls, url].join('\n'));
  const upload = useMediaUpload(folder, addUrl);
  const removeUrl = (url: string) => onChange(urls.filter((item) => item !== url).join('\n'));
  const busy = upload.uploading;

  return (
    <YStack gap={8}>
      <Text fontSize={14} fontWeight="500" color="$color">
        {label}
      </Text>
      {urls.length > 0 ? (
        <XStack gap={8} flexWrap="wrap">
          {urls.map((url) => (
            <YStack
              key={url}
              testID={`media-thumb-${url}`}
              width={84}
              height={84}
              borderRadius={10}
              overflow="hidden"
              borderWidth={1}
              borderColor="$borderColor"
              backgroundColor="$surface"
              alignItems="center"
              justifyContent="center"
            >
              {VIDEO_URL_RE.test(url) ? (
                <MaterialIcons name="videocam" size={26} color={muted} />
              ) : (
                <AppImage source={{ uri: url }} style={{ width: 84, height: 84 }} />
              )}
              <XStack
                testID={`media-remove-${url}`}
                role="button"
                aria-label="Remove media"
                onPress={() => removeUrl(url)}
                position="absolute"
                top={2}
                right={2}
                width={22}
                height={22}
                alignItems="center"
                justifyContent="center"
                borderRadius={11}
                backgroundColor="rgba(0,0,0,0.55)"
                pressStyle={{ opacity: 0.8 }}
              >
                <MaterialIcons name="close" size={14} color="#ffffff" />
              </XStack>
            </YStack>
          ))}
        </XStack>
      ) : null}
      <YStack
        testID="media-upload-add"
        role="button"
        aria-label="Add media"
        aria-disabled={busy}
        onPress={busy ? undefined : () => void upload.pick()}
        alignItems="center"
        justifyContent="center"
        gap={8}
        paddingVertical={24}
        paddingHorizontal={16}
        borderRadius={16}
        borderWidth={2}
        borderColor="$borderColor"
        borderStyle="dashed"
        backgroundColor="$surface"
        opacity={busy ? 0.7 : 1}
        pressStyle={{ opacity: 0.85 }}
      >
        <YStack
          width={52}
          height={52}
          borderRadius={26}
          alignItems="center"
          justifyContent="center"
          backgroundColor="$background"
          borderWidth={1}
          borderColor="$borderColor"
        >
          <MaterialIcons name="add-photo-alternate" size={24} color={primary} />
        </YStack>
        <Text fontSize={14} fontWeight="800" color="$color">
          Upload an image or video
        </Text>
        <Text fontSize={12} color="$muted">
          {uploadHint(settings?.allowed_image_formats, settings?.max_image_mb)}
        </Text>
      </YStack>
      {upload.error && !upload.pending ? (
        <Text testID="media-upload-error" fontSize={12} color="$danger">
          {upload.error}
        </Text>
      ) : null}
      {error ? (
        <Text testID="media_text-error" fontSize={12} color="$danger">
          {error}
        </Text>
      ) : null}
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
    </YStack>
  );
}
