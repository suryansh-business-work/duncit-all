import { MaterialIcons } from '@expo/vector-icons';
import { YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  kind: 'HOST' | 'VENUE';
  imageUrl: string;
  size: number;
}

/** A venue's cover (rounded square) or a host's photo (circle), with a glyph when there is none. */
export function PartnerAvatar({ kind, imageUrl, size }: Readonly<Props>) {
  const { primary } = useThemeColors();
  const radius = kind === 'VENUE' ? 12 : size / 2;
  if (imageUrl) {
    return (
      <AppImage
        source={{ uri: imageUrl }}
        style={{ width: size, height: size, borderRadius: radius }}
      />
    );
  }
  return (
    <YStack
      width={size}
      height={size}
      borderRadius={radius}
      backgroundColor="$soft"
      alignItems="center"
      justifyContent="center"
    >
      <MaterialIcons
        name={kind === 'VENUE' ? 'storefront' : 'person'}
        size={size / 2.5}
        color={primary}
      />
    </YStack>
  );
}
