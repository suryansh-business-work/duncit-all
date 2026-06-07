import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { config } from '@/constants/config';
import { useThemeColors } from '@/hooks/useThemeColors';
import { locationMapEmbedUrl } from '@/utils/location-tree';

interface Props {
  query: string;
  height?: number;
}

/** Web variant — a real DOM <iframe> embed (react-native-web renders intrinsic
 * tags through React DOM) so the experience matches mWeb exactly. */
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
        <a
          data-testid="map-open-external"
          href={mapUrl}
          target="_blank"
          rel="noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
        >
          <Text fontSize={13} fontWeight="800" color="$primary">
            Open in Maps
          </Text>
          <MaterialIcons name="open-in-new" size={14} color={primary} />
        </a>
      </XStack>
      <iframe
        title="Pod location map"
        src={url}
        loading="lazy"
        style={{
          width: '100%',
          height,
          border: 0,
          borderRadius: 12,
          display: 'block',
        }}
      />
    </YStack>
  );
}
