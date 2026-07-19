import { AppImage } from '@/components/AppImage';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { useSupportUpload } from '@/hooks/useSupportUpload';
import { useThemeColors } from '@/hooks/useThemeColors';

const IMAGE_URL_RE = /\.(jpe?g|png|gif|webp|heic|heif)$/i;

interface Props {
  value: string;
  onChange: (url: string) => void;
  error?: string;
}

/** Venue Bill — a single image/PDF picked from the device and uploaded directly
 * to ImageKit (bypassing the API body cap). Stores one hosted URL string with a
 * preview + remove control. Device-upload only (no raw URL box). */
export function BillUploadField({ value, onChange, error }: Readonly<Props>) {
  const { muted, primary } = useThemeColors();
  const upload = useSupportUpload('/pod-bills');
  const fileName = value.slice(value.lastIndexOf('/') + 1);
  const isImage = IMAGE_URL_RE.test(value);

  const addFile = async () => {
    const url = await upload.pickAndUpload();
    if (url) onChange(url);
  };

  return (
    <YStack gap={8}>
      <Text fontSize={14} fontWeight="500" color="$color">
        Venue Bill
      </Text>
      {value ? (
        <XStack
          testID="bill-preview"
          alignItems="center"
          gap={10}
          padding={10}
          borderRadius={12}
          borderWidth={1}
          borderColor="$borderColor"
          backgroundColor="$surface"
        >
          {isImage ? (
            <AppImage source={{ uri: value }} style={{ width: 44, height: 44, borderRadius: 10 }} />
          ) : (
            <YStack
              width={44}
              height={44}
              borderRadius={10}
              alignItems="center"
              justifyContent="center"
              backgroundColor="$background"
              borderWidth={1}
              borderColor="$borderColor"
            >
              <MaterialIcons name="description" size={22} color={muted} />
            </YStack>
          )}
          <Text flex={1} fontSize={13} fontWeight="700" color="$color" numberOfLines={1}>
            {fileName}
          </Text>
          <XStack
            testID="bill-remove"
            role="button"
            aria-label="Remove venue bill"
            onPress={() => onChange('')}
            width={28}
            height={28}
            alignItems="center"
            justifyContent="center"
            borderRadius={14}
            pressStyle={{ opacity: 0.7 }}
          >
            <MaterialIcons name="close" size={16} color={muted} />
          </XStack>
        </XStack>
      ) : (
        <XStack
          testID="bill-upload-add"
          role="button"
          aria-label="Upload the venue bill"
          aria-disabled={upload.uploading}
          onPress={upload.uploading ? undefined : () => void addFile()}
          alignItems="center"
          justifyContent="center"
          gap={8}
          paddingVertical={14}
          borderRadius={12}
          borderWidth={2}
          borderColor="$borderColor"
          borderStyle="dashed"
          backgroundColor="$surface"
          opacity={upload.uploading ? 0.7 : 1}
          pressStyle={{ opacity: 0.85 }}
        >
          {upload.uploading ? (
            <Spinner size="small" color={primary} />
          ) : (
            <MaterialIcons name="upload-file" size={20} color={primary} />
          )}
          <Text fontSize={13.5} fontWeight="800" color="$color">
            {upload.uploading ? 'Uploading…' : 'Upload the venue bill'}
          </Text>
        </XStack>
      )}
      {upload.error ? (
        <Text testID="bill-upload-error" fontSize={12} color="$danger">
          {upload.error}
        </Text>
      ) : null}
      {error ? (
        <Text testID="bill_url-error" fontSize={12} color="$danger">
          {error}
        </Text>
      ) : null}
    </YStack>
  );
}
