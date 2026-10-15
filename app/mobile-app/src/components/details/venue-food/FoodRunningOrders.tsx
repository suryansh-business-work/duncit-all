import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { YStack } from 'tamagui';
import { MY_FOOD_ORDERS_PAGE_SIZE, foodOrderKeyFor } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useMyFoodOrders } from '@/hooks/useMyFoodOrders';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';

/**
 * Every order of the member's still running at this venue — each with its own
 * "Track your order" button — and the way to all of their food orders. The
 * server decides what is running and whose it is (the account, or the keys
 * this device kept). Nothing shows while none is running.
 * Tamagui twin of mWeb's food/FoodRunningOrders.
 */
export function FoodRunningOrders({ venueId }: Readonly<{ venueId: string }>) {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { rows, keys } = useMyFoodOrders('CURRENT', MY_FOOD_ORDERS_PAGE_SIZE.current, venueId);
  if (rows.length === 0) return null;

  return (
    <SurfaceCard testID="venue-food-running-orders" gap={8}>
      <YStack gap={8}>
        {rows.map((order) => (
          <DuncitButton
            key={order.id}
            testID={`venue-food-track-order-${order.id}`}
            label={t('mweb.venueFood.trackOrder', { vars: { orderNo: order.order_no } })}
            variant="soft"
            fullWidth
            onPress={() =>
              navigation.navigate('VenueFoodOrder', {
                venueId: order.venue_id,
                orderId: order.id,
                key: foodOrderKeyFor(keys, order.id) ?? undefined,
              })
            }
          />
        ))}
      </YStack>
      <DuncitButton
        testID="venue-food-my-orders"
        label={t('mweb.venueFood.myOrders.viewAll')}
        variant="ghost"
        size="sm"
        onPress={() => navigation.navigate('MyFoodOrders')}
      />
    </SurfaceCard>
  );
}
