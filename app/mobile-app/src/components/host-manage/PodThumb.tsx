import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import { useThemeColors } from '@/hooks/useThemeColors';

const THUMB_STYLE = { width: 56, height: 56, borderRadius: 12 };

/**
 * A pod's 56px cover thumbnail. A pod with no still — or one whose image fails
 * to load — shows the event glyph on the soft fill instead. mWeb twin:
 * host-manage-page/PodThumb.
 */
export function PodThumb({ uri }: Readonly<{ uri?: string }>) {
  const { accent } = useThemeColors();
  const [failed, setFailed] = useState(false);

  if (uri && !failed) {
    return (
      <AppImage
        source={{ uri }}
        style={THUMB_STYLE}
        recyclingKey={uri}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <YStack
      width={56}
      height={56}
      borderRadius={12}
      alignItems="center"
      justifyContent="center"
      backgroundColor="$soft"
    >
      <MaterialIcons name="event" size={24} color={accent} />
    </YStack>
  );
}
