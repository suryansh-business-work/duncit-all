import { YStack } from 'tamagui';

import { useConfigStore } from '@/stores/config.store';
import { locationMapEmbedUrl, locationMapQuery } from '@/utils/location-tree';
import { useTranslation } from '@/hooks/useTranslation';
import { useThemeColors } from '@/hooks/useThemeColors';

import { SectionLabel } from './SectionLabel';

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
  const { soft } = useThemeColors();
  const apiKey = useConfigStore((s) => s.googleMapApiKey);
  const query = locationMapQuery(city, zoneName, pincode, country);
  const url = locationMapEmbedUrl(apiKey, query);
  if (!url) return null;

  return (
    <YStack gap={8}>
      <SectionLabel>MAP</SectionLabel>
      <iframe
        title={t('mweb.common.selectedLocationMap')}
        src={url}
        loading="lazy"
        style={{
          width: '100%',
          height: 200,
          border: 0,
          borderRadius: 18,
          display: 'block',
          backgroundColor: soft,
        }}
      />
    </YStack>
  );
}
