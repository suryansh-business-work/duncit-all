import { WebView } from 'react-native-webview';
import { Text, YStack } from 'tamagui';

import { useConfigStore } from '@/stores/config.store';
import { locationMapEmbedUrl, locationMapQuery, mapEmbedHtml } from '@/utils/location-tree';

interface Props {
  city?: string | null;
  zoneName?: string | null;
  pincode?: string | null;
  country?: string | null;
}

/** Interactive Google Maps embed (pan/zoom) for the selected place. Renders
 * nothing when the API key or selection is missing — graceful, like mWeb. */
export function LocationMap({ city, zoneName, pincode, country }: Readonly<Props>) {
  const apiKey = useConfigStore((s) => s.googleMapApiKey);
  const query = locationMapQuery(city, zoneName, pincode, country);
  const url = locationMapEmbedUrl(apiKey, query);
  if (!url) return null;

  return (
    <YStack gap={6}>
      <Text fontSize={11} fontWeight="900" color="$muted" letterSpacing={0.6}>
        MAP
      </Text>
      <YStack
        height={180}
        borderRadius={12}
        overflow="hidden"
        borderWidth={1}
        borderColor="$borderColor"
      >
        <WebView
          testID="location-map"
          originWhitelist={['*']}
          source={{ html: mapEmbedHtml(url) }}
          style={{ flex: 1, backgroundColor: 'transparent' }}
        />
      </YStack>
    </YStack>
  );
}
