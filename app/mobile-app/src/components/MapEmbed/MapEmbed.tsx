import { Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useConfigStore } from '@/stores/config.store';
import { useThemeColors } from '@/hooks/useThemeColors';
import { locationMapEmbedUrl, mapEmbedHtml } from '@/utils/location-tree';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  query: string;
  height?: number;
}

/** Interactive Google Maps embed (pan/zoom) for a place query, with an
 * "Open in Maps" link under it. Renders nothing when the API key or query is
 * missing — graceful, exactly like mWeb's PodMapSection. */
export function MapEmbed({ query, height = 220 }: Readonly<Props>) {
  const { t } = useTranslation();
  const { primary } = useThemeColors();
  const apiKey = useConfigStore((s) => s.googleMapApiKey);
  const url = locationMapEmbedUrl(apiKey, query);
  if (!url) return null;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  const openLabel = t('mweb.mapEmbed.openInMaps');

  return (
    <YStack gap={4}>
      <YStack height={height} borderRadius={18} overflow="hidden" backgroundColor="$soft">
        <WebView
          testID="pod-map"
          originWhitelist={['*']}
          source={{ html: mapEmbedHtml(url) }}
          style={{ flex: 1, backgroundColor: 'transparent' }}
        />
      </YStack>
      <XStack
        testID="map-open-external"
        role="button"
        aria-label={openLabel}
        onPress={() => Linking.openURL(mapUrl)}
        alignItems="center"
        alignSelf="flex-end"
        gap={4}
        paddingVertical={6}
        paddingHorizontal={4}
        pressStyle={PRESS_STYLE.row}
      >
        <Text fontSize={13} fontWeight="600" color="$primary">
          {openLabel}
        </Text>
        <MaterialIcons name="open-in-new" size={14} color={primary} />
      </XStack>
    </YStack>
  );
}
