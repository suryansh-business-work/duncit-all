import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import {
  podProductBlurb,
  podProductImage,
  podProductStock,
  type PodPickerProduct,
} from '@duncit/utils';

interface Props {
  product: PodPickerProduct;
  selected: boolean;
  /** Already attached to the pod — shown, but not pickable again. */
  added: boolean;
  onSelect: (id: string) => void;
}

/** One product in the native picker list. The whole card is the select control,
 * so a host picks by tapping the name card. mWeb twin (ProductCard). */
export function ProductPickerCard({ product, selected, added, onSelect }: Readonly<Props>) {
  const { muted, primary } = useThemeColors();
  const { t } = useTranslation();
  const stock = podProductStock(product);
  const outOfStock = stock <= 0;
  const disabled = added || outOfStock;
  const image = podProductImage(product);
  const blurb = podProductBlurb(product);

  let statusLabel = t('podProduct.unitsLeft', { vars: { count: stock } });
  if (added) statusLabel = t('podProduct.alreadyAdded');
  else if (outOfStock) statusLabel = t('podProduct.outOfStock');

  return (
    <XStack
      testID={`product-card-${product.id}`}
      role="button"
      aria-label={product.product_name}
      aria-pressed={selected}
      aria-disabled={disabled}
      onPress={disabled ? undefined : () => onSelect(product.id)}
      gap={10}
      padding={10}
      borderRadius={12}
      borderWidth={selected ? 2 : 1}
      borderColor={selected ? '$primary' : '$borderColor'}
      backgroundColor={selected ? 'rgba(99,102,241,0.08)' : 'transparent'}
      opacity={disabled ? 0.55 : 1}
      pressStyle={{ opacity: 0.8 }}
    >
      <YStack
        width={64}
        height={64}
        borderRadius={10}
        overflow="hidden"
        backgroundColor="$borderColor"
        alignItems="center"
        justifyContent="center"
      >
        {image ? (
          <Image
            source={{ uri: image }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
          />
        ) : (
          <MaterialIcons name="image-not-supported" size={20} color={muted} />
        )}
      </YStack>

      <YStack flex={1} gap={2}>
        <Text fontSize={14} fontWeight="700" color="$color" numberOfLines={2}>
          {product.product_name}
        </Text>
        {product.brand_name ? (
          <Text fontSize={11.5} color="$muted" numberOfLines={1}>
            {product.brand_name}
          </Text>
        ) : null}
        {blurb ? (
          <Text fontSize={11.5} color="$muted" numberOfLines={2}>
            {blurb}
          </Text>
        ) : null}
        <XStack alignItems="center" justifyContent="space-between" gap={8} marginTop={2}>
          <Text fontSize={13} fontWeight="700" color="$primary">
            {t('podProduct.perUnit', { vars: { cost: `₹${product.unit_cost}` } })}
          </Text>
          <Text fontSize={11.5} color="$muted">
            {statusLabel}
          </Text>
        </XStack>
      </YStack>

      {selected ? <MaterialIcons name="check-circle" size={20} color={primary} /> : null}
    </XStack>
  );
}
