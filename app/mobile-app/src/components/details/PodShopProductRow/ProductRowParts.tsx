import type { ReactNode } from 'react';

import { AppImage } from '@/components/AppImage';

import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import type { PodDetail } from '@/hooks/useDetails';
import { PRESS_STYLE } from '@duncit/buttons-native';

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

/** The add-to-cart CTA shown while the product has no line in the cart yet. */
export function AddToCartButton({
  productId,
  productName,
  onAdd,
}: Readonly<{
  productId: string;
  productName: Product['product_name'];
  onAdd: () => void;
}>) {
  const { onPrimary } = useThemeColors();
  return (
    <XStack
      testID={`pod-shop-add-${productId}`}
      role="button"
      tabIndex={0}
      aria-label={`Add ${productName} to cart`}
      hitSlop={6}
      onPress={onAdd}
      gap={6}
      alignItems="center"
      alignSelf="flex-start"
      marginTop={6}
      paddingHorizontal={12}
      height={32}
      borderRadius={999}
      backgroundColor="$primary"
      pressStyle={PRESS_STYLE.control}
    >
      <MaterialIcons name="add-shopping-cart" size={15} color={onPrimary} />
      <Text fontSize={12.5} fontWeight="700" color={onPrimary}>
        Add to cart
      </Text>
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
