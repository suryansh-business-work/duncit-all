import type { ReactNode } from 'react';

import { AppImage } from '@/components/AppImage';

import { MaterialIcons } from '@expo/vector-icons';
import { XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import type { PodDetail } from '@/hooks/useDetails';

export type Product = PodDetail['product_requests'][number];

/** The row shell — a soft tile on the card, primary-tinted while in the cart. */
export function ProductRowShell({
  testID,
  selected,
  children,
}: Readonly<{
  testID: string;
  selected: boolean;
  children: ReactNode;
}>) {
  return (
    <XStack
      testID={testID}
      gap={10}
      alignItems="center"
      padding={10}
      borderRadius={16}
      backgroundColor={selected ? '$primarySoft' : '$soft'}
    >
      {children}
    </XStack>
  );
}

/** Product thumbnail; falls back to a bag icon when the product has no image. */
export function ProductThumb({ image }: Readonly<{ image: string }>) {
  const { accent } = useThemeColors();
  return (
    <YStack
      width={48}
      height={48}
      borderRadius={12}
      overflow="hidden"
      backgroundColor="$surface"
      alignItems="center"
      justifyContent="center"
    >
      {image ? (
        <AppImage source={{ uri: image }} style={{ width: 48, height: 48 }} resizeMode="cover" />
      ) : (
        <MaterialIcons name="shopping-bag" size={20} color={accent} />
      )}
    </YStack>
  );
}
