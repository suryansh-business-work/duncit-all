import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { DISABLED_OPACITY, PRESS_STYLE } from '@duncit/buttons-native';
import { FOOD_ORDER_LIMITS, type VenueFoodItem } from '@duncit/utils';

import { AppImage } from '@/components/AppImage';
import { CartNoticeChip } from '@/components/cart/CartNoticeChip';
import { CartQuantityControl } from '@/components/cart/CartQuantityControl';
import { cartControlLabels } from '@/components/cart/cartControlLabels';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useCartControlNotice } from '@/hooks/useCartControlNotice';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

import { DietMark } from './DietMark';
import { FoodItemPrice } from './FoodItemPrice';
import { FoodItemVideos } from './FoodItemVideos';
import { SpiceMark } from './SpiceMark';

interface Props {
  item: VenueFoodItem;
  /** The configured currency symbol (Finance settings). */
  currency: string;
  /** The dish's own screen — its name opens it. */
  onOpenDetails?: (item: VenueFoodItem) => void;
  /** The venue takes orders right now — the dish gets its cart control. */
  canOrder: boolean;
  /** How many of this dish the cart holds. */
  quantity: number;
  /** The stored cart was read back — until then a quantity arriving is not an add. */
  cartReady: boolean;
  onQuantity: (itemId: string, quantity: number) => void;
}

const THUMB_SIZE = 96;

/**
 * The dish's first photo, or a plain mark when it has none. It is a picture,
 * not a control: a press falls through to the card, which opens the dish —
 * whose screen holds every photo and the viewer.
 */
function Thumb({ item }: Readonly<Pick<Props, 'item'>>) {
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
    <YStack
      testID={`food-item-image-${item.id}`}
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
    </YStack>
  );
}

/**
 * One dish — the whole card opens the dish's own screen when it has one: its
 * diet and heat marks, name, price and description on the left,
 * its photo on the right with the cart control under it — the photo says when
 * the dish goes in or comes out. A dish that is off for now stays on the menu,
 * dimmed and labelled, and cannot be added. Tamagui twin of mWeb's
 * food/FoodItemCard.
 */
export function FoodItemCard({
  item,
  currency,
  onOpenDetails,
  canOrder,
  quantity,
  cartReady,
  onQuantity,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = cartControlLabels(t, item.name);
  const notice = useCartControlNotice(quantity, cartReady);
  const dim = item.is_available ? 1 : DISABLED_OPACITY;
  const openDetails = onOpenDetails ? () => onOpenDetails(item) : undefined;

  // The whole card opens the dish; the cart control and clips inside it take
  // their own presses. No tabIndex, so screen readers still reach those
  // controls — the dish name stays the card's accessible link.
  return (
    <SurfaceCard
      testID={`food-item-${item.id}`}
      flexDirection="row"
      gap={12}
      padding={12}
      onPress={openDetails}
      pressStyle={openDetails ? PRESS_STYLE.surface : undefined}
    >
      <YStack flex={1} gap={4}>
        <XStack alignItems="center" gap={6} opacity={dim}>
          <DietMark diet={item.diet} />
          <SpiceMark level={item.spice_level} />
        </XStack>
        <Text
          testID={`food-item-open-${item.id}`}
          role={openDetails ? 'link' : undefined}
          onPress={openDetails}
          fontSize={15}
          fontWeight="600"
          color="$color"
          opacity={dim}
        >
          {item.name}
        </Text>
        <FoodItemPrice item={item} currency={currency} opacity={dim} />
        {item.description ? (
          <Text fontSize={13} color="$muted" lineHeight={18} opacity={dim}>
            {item.description}
          </Text>
        ) : null}
        <FoodItemVideos item={item} />
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
          <Thumb item={item} />
          <CartNoticeChip notice={notice} labels={labels} testID={`food-item-notice-${item.id}`} />
        </YStack>
        {canOrder && item.is_available ? (
          <CartQuantityControl
            quantity={quantity}
            max={FOOD_ORDER_LIMITS.maxQuantity}
            labels={labels}
            onChange={(next) => onQuantity(item.id, next)}
            testIdPrefix={`food-item-stepper-${item.id}`}
            testIds={{
              add: `food-item-add-${item.id}`,
              count: `food-item-stepper-${item.id}-value`,
            }}
          />
        ) : null}
      </YStack>
    </SurfaceCard>
  );
}
