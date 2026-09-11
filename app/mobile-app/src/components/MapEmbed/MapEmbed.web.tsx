import { MaterialIcons } from '@expo/vector-icons';
import { Text, YStack } from 'tamagui';

import { useConfigStore } from '@/stores/config.store';
import { useThemeColors } from '@/hooks/useThemeColors';
import { locationMapEmbedUrl } from '@/utils/location-tree';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  query: string;
  height?: number;
}

/** Web variant — a real DOM <iframe> embed (react-native-web renders intrinsic
 * tags through React DOM) so the experience matches mWeb exactly. */
export function MapEmbed({ query, height = 220 }: Readonly<Props>) {
  const { t } = useTranslation();
  const { primary, soft } = useThemeColors();
  const apiKey = useConfigStore((s) => s.googleMapApiKey);
  const url = locationMapEmbedUrl(apiKey, query);
  if (!url) return null;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

  return (
    <YStack gap={4}>
      <iframe
        title={t('mweb.mapEmbed.podLocationMap')}
        src={url}
        loading="lazy"
        style={{
          width: '100%',
          height,
          border: 0,
          borderRadius: 18,
          display: 'block',
          backgroundColor: soft,
        }}
      />
      <a
        data-testid="map-open-external"
        href={mapUrl}
        target="_blank"
        rel="noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          alignSelf: 'flex-end',
          gap: 4,
          padding: '6px 4px',
          textDecoration: 'none',
        }}
      >
        <Text fontSize={13} fontWeight="600" color="$primary">
          {t('mweb.mapEmbed.openInMaps')}
        </Text>
        <MaterialIcons name="open-in-new" size={14} color={primary} />
      </a>
    </YStack>
  );
}
