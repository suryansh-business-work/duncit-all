import { MaterialIcons } from '@expo/vector-icons';
import { Text, YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';

import { previewBoxSize } from '../cropRect';
import type { PickedMedia } from './types';

interface PreviewProps {
  media: PickedMedia;
  aspect: number;
  zoom: number;
}

/** Cropped preview (image scaled inside the aspect frame) or a video placeholder. */
export function MediaPreview({ media, aspect, zoom }: Readonly<PreviewProps>) {
  const box = previewBoxSize(aspect);
  if (media.kind === 'video') {
    return (
      <YStack
        testID="crop-video-preview"
        width={box.width}
        height={box.height}
        borderRadius={18}
        alignItems="center"
        justifyContent="center"
        gap={8}
        backgroundColor="rgba(255,255,255,0.1)"
      >
        <MaterialIcons name="videocam" size={40} color="#ffffff" />
        <Text fontSize={12} color="rgba(255,255,255,0.85)">
          Video ready to upload
        </Text>
      </YStack>
    );
  }
  return (
    <YStack
      width={box.width}
      height={box.height}
      borderRadius={18}
      overflow="hidden"
      borderWidth={2}
      borderColor="rgba(255,255,255,0.85)"
    >
      <AppImage
        testID="crop-image-preview"
        source={{ uri: media.uri }}
        style={{ width: box.width, height: box.height, transform: [{ scale: zoom }] }}
        resizeMode="cover"
      />
    </YStack>
  );
}
