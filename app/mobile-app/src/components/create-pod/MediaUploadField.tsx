import { Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, Spinner, Text, XStack, YStack } from 'tamagui';

import { useMediaUpload } from '@/hooks/useMediaUpload';
import { useThemeColors } from '@/hooks/useThemeColors';

const VIDEO_URL_RE = /\.(mp4|mov|webm)$/i;

const splitLines = (text: string) =>
  text
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

interface Props {
  value: string;
  onChange: (text: string) => void;
  error?: string;
}

/** Pod media — upload from the library into a thumbnail list (URLs serialize
 * into media_text); paste URLs directly in the box below. Mirrors mWeb's
 * MediaUrlsField (B3-9). */
export function MediaUploadField({ value, onChange, error }: Readonly<Props>) {
  const { muted, primary } = useThemeColors();
  const upload = useMediaUpload('/pods');
  const urls = splitLines(value ?? '');
  const removeUrl = (url: string) => onChange(urls.filter((item) => item !== url).join('\n'));

  const addFromLibrary = async () => {
    const url = await upload.pickAndUpload();
    if (url) onChange([...urls, url].join('\n'));
  };

  return (
    <YStack gap={8}>
      <Text fontSize={14} fontWeight="500" color="$color">
        Cover image (at least one image)
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
                <Image source={{ uri: url }} style={{ width: 84, height: 84 }} />
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
        aria-disabled={upload.uploading}
        onPress={upload.uploading ? undefined : () => void addFromLibrary()}
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
        opacity={upload.uploading ? 0.7 : 1}
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
          {upload.uploading ? (
            <Spinner size="small" color={primary} />
          ) : (
            <MaterialIcons name="add-photo-alternate" size={24} color={primary} />
          )}
        </YStack>
        <Text fontSize={14} fontWeight="800" color="$color">
          {upload.uploading ? 'Uploading…' : 'Upload an image'}
        </Text>
        <Text fontSize={12} color="$muted">
          Min 800×400px (JPG, PNG)
        </Text>
      </YStack>
      <Input
        testID="field-media_text"
        size="$4"
        backgroundColor="$surface"
        color="$color"
        placeholderTextColor="$muted"
        borderColor={error ? '$danger' : '$borderColor'}
        value={value}
        onChangeText={onChange}
        placeholder="…or paste URLs, one per line"
        multiline
        aria-label="Media URLs"
      />
      {upload.error ? (
        <Text testID="media-upload-error" fontSize={12} color="$danger">
          {upload.error}
        </Text>
      ) : null}
      {error ? (
        <Text testID="media_text-error" fontSize={12} color="$danger">
          {error}
        </Text>
      ) : null}
    </YStack>
  );
}
