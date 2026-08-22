import { Text, YStack } from 'tamagui';

import { useConfigStore } from '@/stores/config.store';
import { locationMapEmbedUrl, locationMapQuery } from '@/utils/location-tree';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  city?: string | null;
  zoneName?: string | null;
  pincode?: string | null;
  country?: string | null;
}

/** Web variant of the location map — a real DOM <iframe> embed (react-native-web
 * renders intrinsic tags through React DOM), so the experience matches mWeb. */
export function LocationMap({ city, zoneName, pincode, country }: Readonly<Props>) {
  const { t } = useTranslation();
  const apiKey = useConfigStore((s) => s.googleMapApiKey);
  const query = locationMapQuery(city, zoneName, pincode, country);
  const url = locationMapEmbedUrl(apiKey, query);
  if (!url) return null;

  return (
    <YStack gap={6}>
      <Text fontSize={11} fontWeight="700" color="$muted" letterSpacing={0.6}>
        MAP
      </Text>
      <iframe
        title={t('mweb.common.selectedLocationMap')}
        src={url}
        loading="lazy"
        style={{
          width: '100%',
          height: 180,
          border: 0,
          borderRadius: 12,
          display: 'block',
        }}
      />
    </YStack>
  );
}
