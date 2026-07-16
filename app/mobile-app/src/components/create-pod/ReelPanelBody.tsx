import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  value: string;
  uploading: boolean;
  error?: string;
  onPick: () => void;
  onRemove: () => void;
}

/** Expanded "Pod Reel" panel: helper copy + either the picked-reel preview row
 * or the pick-a-video upload button, with the inline upload/validation error. */
export function ReelPanelBody({ value, uploading, error, onPick, onRemove }: Readonly<Props>) {
  const { muted, primary } = useThemeColors();
  const fileName = value.slice(value.lastIndexOf('/') + 1);
  return (
    <YStack gap={10}>
      <Text fontSize={12} color="$muted">
        Your reel plays in the Explore feed while this pod is live. One video, up to 100MB.
      </Text>
      {value ? (
        <XStack
          testID="reel-preview"
          alignItems="center"
          gap={10}
          padding={10}
          borderRadius={12}
          borderWidth={1}
          borderColor="$borderColor"
          backgroundColor="$surface"
        >
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
            <MaterialIcons name="videocam" size={22} color={muted} />
          </YStack>
          <Text flex={1} fontSize={13} fontWeight="700" color="$color" numberOfLines={1}>
            {fileName}
          </Text>
          <XStack
            testID="reel-remove"
            role="button"
            aria-label="Remove reel"
            onPress={onRemove}
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
          testID="reel-upload-add"
          role="button"
          aria-label="Upload a reel video"
          aria-disabled={uploading}
          onPress={uploading ? undefined : onPick}
          alignItems="center"
          justifyContent="center"
          gap={8}
          paddingVertical={14}
          borderRadius={12}
          borderWidth={2}
          borderColor="$borderColor"
          borderStyle="dashed"
          backgroundColor="$surface"
          opacity={uploading ? 0.7 : 1}
          pressStyle={{ opacity: 0.85 }}
        >
          {uploading ? (
            <Spinner size="small" color={primary} />
          ) : (
            <MaterialIcons name="video-library" size={20} color={primary} />
          )}
          <Text fontSize={13.5} fontWeight="800" color="$color">
            {uploading ? 'Uploading…' : 'Upload a video'}
          </Text>
        </XStack>
      )}
      {error ? (
        <Text testID="reel-upload-error" fontSize={12} color="$danger">
          {error}
        </Text>
      ) : null}
    </YStack>
  );
}
