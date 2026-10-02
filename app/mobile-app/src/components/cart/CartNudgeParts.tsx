import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { AppImage } from '@/components/AppImage';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { CartLine } from '@/stores/cart.store';

const MAX_THUMBS = 3;
const THUMB = 40;
const THUMB_STYLE = { width: THUMB, height: THUMB } as const;

/** Cart thumbnails stacked in the nudge's corner — up to three, the rest
 * implied; a cart icon when no line has an image. */
export function CartNudgeThumbs({ lines }: Readonly<{ lines: CartLine[] }>) {
  const { onPrimary } = useThemeColors();
  const shown = lines.filter((line) => line.image_url).slice(0, MAX_THUMBS);
  if (shown.length === 0) {
    return (
      <YStack
        width={THUMB}
        height={THUMB}
        borderRadius={8}
        alignItems="center"
        justifyContent="center"
        backgroundColor="$primary"
      >
        <MaterialIcons name="shopping-cart" size={20} color={onPrimary} />
      </YStack>
    );
  }
  return (
    <XStack aria-hidden>
      {shown.map((line, index) => (
        <YStack
          key={`${line.pod_id}-${line.product_id}-${line.variant_id}`}
          marginLeft={index === 0 ? 0 : -12}
          borderRadius={8}
          borderWidth={2}
          borderColor="$surface"
          overflow="hidden"
        >
          <AppImage source={{ uri: line.image_url }} style={THUMB_STYLE} resizeMode="cover" />
        </YStack>
      ))}
    </XStack>
  );
}

/** A quiet text button — "Remind me next time" / "Don't remind me again". */
export function CartNudgeTextAction({
  label,
  onPress,
  testID,
}: Readonly<{ label: string; onPress: () => void; testID: string }>) {
  return (
    <XStack
      testID={testID}
      role="button"
      tabIndex={0}
      aria-label={label}
      onPress={onPress}
      paddingVertical={8}
      paddingHorizontal={4}
      pressStyle={PRESS_STYLE.row}
    >
      <Text fontSize={13} fontWeight="600" color="$muted">
        {label}
      </Text>
    </XStack>
  );
}
