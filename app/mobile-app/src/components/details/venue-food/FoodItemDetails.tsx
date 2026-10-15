import { useState } from 'react';
import { ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { FOOD_ORDER_LIMITS, type VenueFoodItem } from '@duncit/utils';

import { AppImage } from '@/components/AppImage';
import { CartNoticeChip } from '@/components/cart/CartNoticeChip';
import { CartQuantityControl } from '@/components/cart/CartQuantityControl';
import { cartControlLabels } from '@/components/cart/cartControlLabels';
import { ImageViewerModal } from '@/components/ImageViewerModal';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useCartControlNotice } from '@/hooks/useCartControlNotice';
import { useFoodCart } from '@/hooks/useFoodCart';
import type { PublicVenueDetails } from '@/hooks/useHostsVenues';
import { usePublicFinance } from '@/hooks/usePublicFinance';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

import { DietMark } from './DietMark';
import { FoodItemPrice } from './FoodItemPrice';
import { FoodItemVideos } from './FoodItemVideos';
import { FoodRatingBadge } from './FoodRatingBadge';
import { SpiceMark } from './SpiceMark';

interface Props {
  venue: PublicVenueDetails;
  item: VenueFoodItem;
}

const PHOTO_HEIGHT = 240;
const THUMB_SIZE = 64;
const FILL = { width: '100%', height: '100%' } as const;

interface PhotoProps {
  uri: string;
  label: string;
  size: { width?: number; height: number };
  radius: number;
  onPress: () => void;
}

/** One photo of the dish — a button into the image viewer. */
function Photo({ uri, label, size, radius, onPress }: Readonly<PhotoProps>) {
  return (
    <XStack
      role="button"
      tabIndex={0}
      aria-label={label}
      onPress={onPress}
      {...size}
      borderRadius={radius}
      overflow="hidden"
      backgroundColor="$soft"
      pressStyle={PRESS_STYLE.surface}
    >
      <AppImage source={{ uri }} style={FILL} resizeMode="cover" />
    </XStack>
  );
}

/**
 * A dish's own screen body: its photos (each opens the viewer), diet and heat
 * marks, name, price and description, the venue's food rating, and — when the
 * venue takes orders — the same cart control the menu card has, on the same
 * cart (kept per venue on the device; the menu re-reads it on return).
 * Tamagui twin of mWeb's venue-food-item-page/FoodItemDetails.
 */
export function FoodItemDetails({ venue, item }: Readonly<Props>) {
  const { t } = useTranslation();
  const { currency } = usePublicFinance();
  const { muted } = useThemeColors();
  const cart = useFoodCart(
    venue.id,
    venue.food_menu,
    venue.food_ordering.discount_pct,
    venue.food_ordering,
  );
  const labels = cartControlLabels(t, item.name);
  const quantity = cart.quantityOf(item.id);
  const notice = useCartControlNotice(quantity, cart.hydrated);
  const [zoom, setZoom] = useState<number | null>(null);
  const canOrder = venue.food_ordering.enabled && item.is_available;
  const [cover] = item.images;
  const viewLabel = t('mweb.venueFood.viewImage', { vars: { name: item.name } });

  return (
    <YStack gap={16} testID={`food-item-details-${item.id}`}>
      {cover ? (
        <Photo
          uri={cover}
          label={viewLabel}
          size={{ height: PHOTO_HEIGHT }}
          radius={16}
          onPress={() => setZoom(0)}
        />
      ) : (
        <YStack
          height={PHOTO_HEIGHT}
          borderRadius={16}
          backgroundColor="$soft"
          alignItems="center"
          justifyContent="center"
        >
          <MaterialIcons name="restaurant" size={40} color={muted} />
        </YStack>
      )}
      {item.images.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
          testID="food-item-thumbs"
        >
          {item.images.map((src, index) => (
            <Photo
              key={src}
              uri={src}
              label={viewLabel}
              size={{ width: THUMB_SIZE, height: THUMB_SIZE }}
              radius={12}
              onPress={() => setZoom(index)}
            />
          ))}
        </ScrollView>
      ) : null}
      <SurfaceCard gap={8}>
        <CartNoticeChip
          notice={notice}
          labels={labels}
          testID={`food-item-details-${item.id}-notice`}
        />
        <XStack alignItems="center" gap={6}>
          <DietMark diet={item.diet} />
          <SpiceMark level={item.spice_level} />
        </XStack>
        <Text role="heading" fontSize={20} fontWeight="700" color="$color">
          {item.name}
        </Text>
        <FoodRatingBadge venueId={venue.id} />
        <XStack alignItems="center" justifyContent="space-between" gap={8}>
          <FoodItemPrice item={item} currency={currency} />
          {canOrder ? (
            <CartQuantityControl
              quantity={quantity}
              max={FOOD_ORDER_LIMITS.maxQuantity}
              labels={labels}
              disabled={!cart.hydrated}
              onChange={(next) => cart.setQuantity(item.id, next)}
              testIdPrefix={`food-item-details-${item.id}`}
            />
          ) : null}
        </XStack>
        {item.is_available ? null : (
          <XStack
            testID="food-item-details-unavailable"
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
        {cart.atMaxLines ? (
          <Text role="alert" fontSize={13} color="$danger">
            {t('mweb.venueFood.maxLines', { vars: { max: String(FOOD_ORDER_LIMITS.maxLines) } })}
          </Text>
        ) : null}
        {item.description ? (
          <Text fontSize={14} color="$muted" lineHeight={20}>
            {item.description}
          </Text>
        ) : null}
        <FoodItemVideos item={item} />
      </SurfaceCard>
      <ImageViewerModal images={item.images} index={zoom} onClose={() => setZoom(null)} />
    </YStack>
  );
}
