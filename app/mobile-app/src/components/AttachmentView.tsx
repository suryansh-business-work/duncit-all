import { Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import { describeAttachment, typeLabel, type AttachmentInfo } from '@/utils/attachment';

const ICON_TINT = '#9aa0a6';

/** Video/document card: type icon + file name + type badge + open/download.
 * Tapping opens the file in the device's default viewer. */
function FileCard({ info }: Readonly<{ info: AttachmentInfo }>) {
  const icon = info.kind === 'video' ? 'play-circle-outline' : 'insert-drive-file';
  return (
    <XStack
      testID={`support-attach-${info.url}`}
      role="button"
      aria-label={`Open ${info.name}`}
      onPress={() => void Linking.openURL(info.url)}
      alignItems="center"
      gap={8}
      padding={8}
      maxWidth={240}
      borderRadius={10}
      backgroundColor="$background"
      pressStyle={{ opacity: 0.8 }}
    >
      <MaterialIcons name={icon} size={22} color={ICON_TINT} />
      <YStack flex={1} minWidth={0}>
        <Text fontSize={12.5} fontWeight="700" color="$color" numberOfLines={1}>
          {info.name}
        </Text>
        <Text fontSize={11} color="$muted">
          {typeLabel(info.ext)}
        </Text>
      </YStack>
      <MaterialIcons name="file-download" size={18} color={ICON_TINT} />
    </XStack>
  );
}

interface Props {
  urls: string[];
  /** Thumbnail edge for images (px). */
  size?: number;
}

/** Type-aware attachment list: images render as thumbnails, videos and
 * documents as a tappable file card with the name + type. */
export function AttachmentView({ urls, size = 180 }: Readonly<Props>) {
  if (!urls.length) return null;
  return (
    <YStack gap={8}>
      {urls.map((url) => {
        const info = describeAttachment(url);
        if (info.kind === 'image') {
          return (
            <AppImage
              key={url}
              source={{ uri: url }}
              style={{ width: size, height: size, borderRadius: 10 }}
              resizeMode="cover"
            />
          );
        }
        return <FileCard key={url} info={info} />;
      })}
    </YStack>
  );
}
