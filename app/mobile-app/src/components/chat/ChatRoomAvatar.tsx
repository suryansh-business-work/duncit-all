import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import { useThemeColors } from '@/hooks/useThemeColors';

/** A chat room's 48px tile: its cover photo, or a glyph on the brand fill —
 * one look for pod rooms and club rooms. */
export function ChatRoomAvatar({
  coverUrl,
  fallbackIcon,
}: Readonly<{
  coverUrl?: string | null;
  fallbackIcon: ComponentProps<typeof MaterialIcons>['name'];
}>) {
  const { onPrimary } = useThemeColors();
  return (
    <YStack
      width={48}
      height={48}
      borderRadius={12}
      overflow="hidden"
      backgroundColor="$primary"
      alignItems="center"
      justifyContent="center"
    >
      {coverUrl ? (
        <AppImage source={{ uri: coverUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      ) : (
        <MaterialIcons name={fallbackIcon} size={24} color={onPrimary} />
      )}
    </YStack>
  );
}
