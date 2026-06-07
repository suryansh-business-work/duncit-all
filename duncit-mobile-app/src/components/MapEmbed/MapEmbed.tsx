import { Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { config } from '@/constants/config';
import { useThemeColors } from '@/hooks/useThemeColors';
import { locationMapEmbedUrl } from '@/utils/location-tree';

interface Props {
  query: string;
  height?: number;
}

/** Interactive Google Maps embed (pan/zoom) for a place query, with an
 * "Open in Maps" shortcut. Renders nothing when the API key or query is
 * missing — graceful, exactly like mWeb's PodMapSection. */
export function MapEmbed({ query, height = 220 }: Props) {
  const { primary } = useThemeColors();
  const url = locationMapEmbedUrl(config.googleMapApiKey, query);
  if (!url) return null;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

  return (
    <YStack gap={8}>
      <XStack alignItems="center" justifyContent="space-between">
        <Text fontSize={12} color="$muted">
          Map preview
        </Text>
        <XStack
          testID="map-open-external"
          role="button"
          aria-label="Open in Maps"
          onPress={() => Linking.openURL(mapUrl)}
          alignItems="center"
          gap={4}
          pressStyle={{ opacity: 0.7 }}
        >
          <Text fontSize={13} fontWeight="800" color="$primary">
            Open in Maps
          </Text>
          <MaterialIcons name="open-in-new" size={14} color={primary} />
        </XStack>
      </XStack>
      <YStack
        height={height}
        borderRadius={12}
        overflow="hidden"
        borderWidth={1}
        borderColor="$borderColor"
      >
        <WebView
          testID="pod-map"
          source={{ uri: url }}
          style={{ flex: 1, backgroundColor: 'transparent' }}
        />
      </YStack>
    </YStack>
  );
}
