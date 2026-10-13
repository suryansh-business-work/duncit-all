import { Text, YStack } from 'tamagui';
import type { FoodMenuGroup, VenueFoodItem } from '@duncit/utils';

import { FoodItemCard } from './FoodItemCard';

interface Props {
  groups: FoodMenuGroup[];
  currency: string;
  onOpenImage: (item: VenueFoodItem) => void;
  /** The venue takes orders right now — dishes get their Add button / stepper. */
  canOrder: boolean;
  quantityOf: (itemId: string) => number;
  onQuantity: (itemId: string, quantity: number) => void;
}

/** The menu under its category headings; the dishes with no category follow, under none.
 * Tamagui twin of mWeb's food/FoodMenuList. */
export function FoodMenuList({
  groups,
  currency,
  onOpenImage,
  canOrder,
  quantityOf,
  onQuantity,
}: Readonly<Props>) {
  return (
    <YStack testID="food-menu-list" gap={20}>
      {groups.map((group) => (
        <YStack key={group.category || 'uncategorised'} gap={10}>
          {group.category ? (
            <Text role="heading" fontSize={16} fontWeight="700" color="$color">
              {group.category}
            </Text>
          ) : null}
          {group.items.map((item) => (
            <FoodItemCard
              key={item.id}
              item={item}
              currency={currency}
              onOpenImage={onOpenImage}
              canOrder={canOrder}
              quantity={quantityOf(item.id)}
              onQuantity={onQuantity}
            />
          ))}
        </YStack>
      ))}
    </YStack>
  );
}
