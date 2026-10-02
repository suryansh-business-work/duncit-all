import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import { FreeDeliveryBadge } from '@/components/cart/FreeDeliveryBadge';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { lineQualifiesFreeDelivery } from '@/services/cart';
import { cartLineKey, type CartLine } from '@/stores/cart.store';
import { PRESS_STYLE } from '@duncit/buttons-native';

/** The line's product photo as a tappable thumbnail that opens the product
 * details; falls back to a shopping-bag placeholder when the line has no image. */
function LineThumb({
  line,
  onInfo,
}: Readonly<{ line: CartLine; onInfo: (productId: string) => void }>) {
  const { muted } = useThemeColors();
  const { t } = useTranslation();
  return (
    <XStack
      testID={`summary-info-${line.pod_id}:${cartLineKey(line)}`}
      role="button"
      tabIndex={0}
      aria-label={t('mweb.checkout.viewProduct', { vars: { name: line.product_name } })}
      hitSlop={2}
      onPress={() => onInfo(line.product_id)}
      pressStyle={PRESS_STYLE.inline}
      width={40}
      height={40}
      borderRadius={8}
      overflow="hidden"
      backgroundColor="$surface"
      alignItems="center"
      justifyContent="center"
    >
      {line.image_url ? (
        <AppImage
          testID={`summary-thumb-${line.pod_id}:${cartLineKey(line)}`}
          source={{ uri: line.image_url }}
          style={{ width: 40, height: 40 }}
          resizeMode="cover"
        />
      ) : (
        <MaterialIcons name="shopping-bag" size={18} color={muted} />
      )}
    </XStack>
  );
}

/** One product line: a tappable product photo (opens the product details),
 * name × qty and its subtotal, plus the free-delivery badge when the line's
 * subtotal reaches the product's threshold. No pod title — separate entities. */
export function ProductLineRow({
  line,
  value,
  onInfo,
}: Readonly<{ line: CartLine; value: string; onInfo: (productId: string) => void }>) {
  const variant = line.variant_label ? ` — ${line.variant_label}` : '';
  const label = `${line.product_name}${variant} × ${line.quantity}`;
  return (
    <YStack gap={2}>
      <XStack justifyContent="space-between" alignItems="center" gap={8}>
        <XStack flex={1} minWidth={0} alignItems="center" gap={8}>
          <LineThumb line={line} onInfo={onInfo} />
          <Text flex={1} fontSize={13} fontWeight="600" color="$muted" numberOfLines={1}>
            {label}
          </Text>
        </XStack>
        <Text fontSize={13} fontWeight="700" color="$color">
          {value}
        </Text>
      </XStack>
      {lineQualifiesFreeDelivery(line) ? (
        <FreeDeliveryBadge testID={`summary-free-delivery-${line.pod_id}:${cartLineKey(line)}`} />
      ) : null}
    </YStack>
  );
}
