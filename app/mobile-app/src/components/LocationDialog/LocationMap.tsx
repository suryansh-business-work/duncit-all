import { WebView } from 'react-native-webview';
import { YStack } from 'tamagui';

import { useConfigStore } from '@/stores/config.store';
import { locationMapEmbedUrl, locationMapQuery, mapEmbedHtml } from '@/utils/location-tree';

import { SectionLabel } from './SectionLabel';

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
    <YStack gap={8}>
      <SectionLabel>MAP</SectionLabel>
      <YStack
        height={200}
        borderRadius={18}
        overflow="hidden"
        borderWidth={1}
        borderColor="$cardBorder"
        backgroundColor="$soft"
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
