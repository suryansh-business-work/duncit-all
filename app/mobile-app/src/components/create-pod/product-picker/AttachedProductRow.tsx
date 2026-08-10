import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import {
  clampPodProductQty,
  podProductImage,
  podProductLineTotal,
  podProductStock,
  type PodPickerProduct,
} from '@duncit/utils';

interface Props {
  product: PodPickerProduct;
  quantity: number;
  onQuantityChange: (next: number) => void;
  onRemove: () => void;
  testID: string;
}

const stepperBox = {
  width: 30,
  height: 30,
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '$borderColor',
  pressStyle: { opacity: 0.7 },
} as const;

/** One attached product on Step 4: thumbnail, name, quantity stepper and line
 * total. Its product is already chosen, so the stepper is live here — the
 * selection gate only governs the picker. mWeb twin (AttachedProductRow). */
export function AttachedProductRow({
  product,
  quantity,
  onQuantityChange,
  onRemove,
  testID,
}: Readonly<Props>) {
  const { color, muted, danger } = useThemeColors();
  const { t } = useTranslation();
  const image = podProductImage(product);
  const stock = podProductStock(product);
  const step = (delta: number) => onQuantityChange(clampPodProductQty(quantity + delta, product));
  const canDecrease = quantity > 1;
  const canIncrease = stock <= 0 || quantity < stock;

  return (
    <XStack
      testID={testID}
      gap={10}
      padding={10}
      borderRadius={12}
      borderWidth={1}
      borderColor="$borderColor"
      alignItems="center"
    >
      <YStack
        width={48}
        height={48}
        borderRadius={9}
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
          <MaterialIcons name="image-not-supported" size={18} color={muted} />
        )}
      </YStack>

      <YStack flex={1} gap={2}>
        <Text fontSize={13.5} fontWeight="700" color="$color" numberOfLines={1}>
          {product.product_name}
        </Text>
        <Text fontSize={11.5} color="$muted">
          {t('podProduct.perUnit', { vars: { cost: `₹${product.unit_cost}` } })}
        </Text>
        <XStack alignItems="center" gap={8} marginTop={4}>
          <XStack
            testID={`${testID}-dec`}
            role="button"
            aria-label={t('podProduct.decreaseQty')}
            aria-disabled={!canDecrease}
            onPress={canDecrease ? () => step(-1) : undefined}
            opacity={canDecrease ? 1 : 0.4}
            {...stepperBox}
          >
            <MaterialIcons name="remove" size={15} color={color} />
          </XStack>
          <Text
            testID={`${testID}-qty`}
            fontSize={13.5}
            fontWeight="700"
            color="$color"
            minWidth={22}
            textAlign="center"
          >
            {quantity}
          </Text>
          <XStack
            testID={`${testID}-inc`}
            role="button"
            aria-label={t('podProduct.increaseQty')}
            aria-disabled={!canIncrease}
            onPress={canIncrease ? () => step(1) : undefined}
            opacity={canIncrease ? 1 : 0.4}
            {...stepperBox}
          >
            <MaterialIcons name="add" size={15} color={color} />
          </XStack>
          <XStack flex={1} />
          <Text fontSize={13} fontWeight="700" color="$color">
            {`₹${podProductLineTotal(product, quantity)}`}
          </Text>
        </XStack>
      </YStack>

      <XStack
        testID={`${testID}-remove`}
        role="button"
        aria-label={t('podProduct.removeProduct')}
        onPress={onRemove}
        pressStyle={{ opacity: 0.7 }}
      >
        <MaterialIcons name="delete-outline" size={20} color={danger} />
      </XStack>
    </XStack>
  );
}
