import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { DISABLED_OPACITY, PRESS_STYLE } from '@duncit/buttons-native';
import { formatFoodMoney, type VenueFoodItem } from '@duncit/utils';

import { AppImage } from '@/components/AppImage';
import { DuncitButton } from '@/components/DuncitButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

import { DietMark } from './DietMark';
import { QuantityStepper } from './QuantityStepper';
import { SpiceMark } from './SpiceMark';

interface Props {
  item: VenueFoodItem;
  /** The configured currency symbol (Finance settings). */
  currency: string;
  onOpenImage: (item: VenueFoodItem) => void;
  /** The venue takes orders right now — the dish gets its Add button / stepper. */
  canOrder: boolean;
  /** How many of this dish the cart holds. */
  quantity: number;
  onQuantity: (itemId: string, quantity: number) => void;
}

const THUMB_SIZE = 96;

/** Add, which becomes − quantity + once the dish is in the cart. */
function OrderControl({
  item,
  quantity,
  onQuantity,
}: Readonly<Pick<Props, 'item' | 'quantity' | 'onQuantity'>>) {
  const { t } = useTranslation();
  if (quantity > 0) {
    return (
      <QuantityStepper
        name={item.name}
        quantity={quantity}
        onChange={(next) => onQuantity(item.id, next)}
        testID={`food-item-stepper-${item.id}`}
      />
    );
  }
  return (
    <DuncitButton
      testID={`food-item-add-${item.id}`}
      label={t('mweb.venueFood.add')}
      accessibilityLabel={t('mweb.venueFood.addItem', { vars: { name: item.name } })}
      variant="outline"
      size="sm"
      onPress={() => onQuantity(item.id, 1)}
    />
  );
}

/** The dish's first photo — a button into the image viewer — or a plain mark when it has none. */
function Thumb({ item, onOpenImage }: Readonly<Pick<Props, 'item' | 'onOpenImage'>>) {
  const { t } = useTranslation();
  const { muted } = useThemeColors();
  const src = item.images[0];
  if (!src) {
    return (
      <YStack
        width={THUMB_SIZE}
        height={THUMB_SIZE}
        borderRadius={16}
        backgroundColor="$soft"
        alignItems="center"
        justifyContent="center"
      >
        <MaterialIcons name="restaurant" size={24} color={muted} />
      </YStack>
    );
  }
  return (
    <XStack
      testID={`food-item-image-${item.id}`}
      role="button"
      tabIndex={0}
      aria-label={t('mweb.venueFood.viewImage', { vars: { name: item.name } })}
      pressStyle={PRESS_STYLE.surface}
      onPress={() => onOpenImage(item)}
      width={THUMB_SIZE}
      height={THUMB_SIZE}
      borderRadius={16}
      backgroundColor="$soft"
      overflow="hidden"
    >
      <AppImage
        source={{ uri: src }}
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
      />
    </XStack>
  );
}

/**
 * One dish: its diet and heat marks, name, price and description on the left,
 * its photo on the right. A dish that is off for now stays on the menu, dimmed
 * and labelled, and cannot be added. Tamagui twin of mWeb's food/FoodItemCard.
 */
export function FoodItemCard({
  item,
  currency,
  onOpenImage,
  canOrder,
  quantity,
  onQuantity,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const dim = item.is_available ? 1 : DISABLED_OPACITY;

  return (
    <SurfaceCard testID={`food-item-${item.id}`} flexDirection="row" gap={12} padding={12}>
      <YStack flex={1} gap={4}>
        <XStack alignItems="center" gap={6} opacity={dim}>
          <DietMark diet={item.diet} />
          <SpiceMark level={item.spice_level} />
        </XStack>
        <Text fontSize={15} fontWeight="600" color="$color" opacity={dim}>
          {item.name}
        </Text>
        <Text fontSize={14} fontWeight="700" color="$color" opacity={dim}>
          {formatFoodMoney(item.price, currency)}
        </Text>
        {item.description ? (
          <Text fontSize={13} color="$muted" lineHeight={18} opacity={dim}>
            {item.description}
          </Text>
        ) : null}
        {item.is_available ? null : (
          <XStack
            testID={`food-item-unavailable-${item.id}`}
            alignSelf="flex-start"
            borderRadius={999}
            paddingHorizontal={10}
            paddingVertical={4}
            backgroundColor="$soft"
          >
            <Text fontSize={12} fontWeight="600" color="$color">
              {t('mweb.venueFood.unavailable')}
            </Text>
          </XStack>
        )}
      </YStack>
      <YStack alignItems="center" gap={8}>
        <YStack opacity={dim}>
          <Thumb item={item} onOpenImage={onOpenImage} />
        </YStack>
        {canOrder && item.is_available ? (
          <OrderControl item={item} quantity={quantity} onQuantity={onQuantity} />
        ) : null}
      </YStack>
    </SurfaceCard>
  );
}
