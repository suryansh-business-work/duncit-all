import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';
import {
  FOOD_OTHER_SECTION_KEY,
  foodSectionKey,
  isFoodSectionOpen,
  type FoodMenuGroup,
  type VenueFoodItem,
} from '@duncit/utils';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

import { FoodItemCard } from './FoodItemCard';

interface Props {
  groups: FoodMenuGroup[];
  currency: string;
  /** The dish's own screen — opened from its name. */
  onOpenDetails: (item: VenueFoodItem) => void;
  /** The venue takes orders right now — dishes get their cart control. */
  canOrder: boolean;
  quantityOf: (itemId: string) => number;
  /** The stored cart was read back (see FoodItemCard). */
  cartReady: boolean;
  onQuantity: (itemId: string, quantity: number) => void;
  /** The menu has named categories — each becomes a section that folds. */
  sectioned: boolean;
  /** The sections the member folded (their keys). */
  collapsed: readonly string[];
  onToggle: (key: string) => void;
}

type DishesProps = Omit<Props, 'groups' | 'sectioned' | 'collapsed' | 'onToggle'> & {
  items: VenueFoodItem[];
};

function Dishes({ items, quantityOf, ...card }: Readonly<DishesProps>) {
  return (
    <YStack gap={10}>
      {items.map((item) => (
        <FoodItemCard key={item.id} item={item} quantity={quantityOf(item.id)} {...card} />
      ))}
    </YStack>
  );
}

interface ToggleProps {
  title: string;
  count: number;
  open: boolean;
  onPress: () => void;
  testID: string;
}

/** A section's heading — a button that folds or opens it. */
function SectionToggle({ title, count, open, onPress, testID }: Readonly<ToggleProps>) {
  const { t } = useTranslation();
  const { muted } = useThemeColors();
  return (
    <XStack
      testID={testID}
      role="button"
      tabIndex={0}
      aria-expanded={open}
      onPress={onPress}
      alignItems="center"
      gap={8}
      minHeight={44}
      pressStyle={PRESS_STYLE.row}
    >
      <Text role="heading" flexShrink={1} fontSize={16} fontWeight="700" color="$color">
        {title}
      </Text>
      <Text flex={1} fontSize={12} color="$muted">
        {t('mweb.venueFood.menuSearch.sectionCount', { count })}
      </Text>
      <MaterialIcons name={open ? 'expand-less' : 'expand-more'} size={24} color={muted} />
    </XStack>
  );
}

/**
 * The menu under its category headings, each a section that folds (the dishes
 * with no category follow under "More dishes"). A menu with no categories at
 * all is one plain list. Tamagui twin of mWeb's food/FoodMenuList.
 */
export function FoodMenuList({
  groups,
  sectioned,
  collapsed,
  onToggle,
  ...dishes
}: Readonly<Props>) {
  const { t } = useTranslation();
  if (!sectioned) {
    return (
      <YStack testID="food-menu-list">
        <Dishes {...dishes} items={groups.flatMap((group) => group.items)} />
      </YStack>
    );
  }
  return (
    <YStack testID="food-menu-list" gap={12}>
      {groups.map((group, index) => {
        const key = foodSectionKey(group);
        const open = isFoodSectionOpen(key, collapsed);
        return (
          <YStack key={key || 'uncategorised'} gap={10}>
            <SectionToggle
              testID={`food-menu-section-${index}`}
              title={group.category || t(FOOD_OTHER_SECTION_KEY)}
              count={group.items.length}
              open={open}
              onPress={() => onToggle(key)}
            />
            {open ? <Dishes {...dishes} items={group.items} /> : null}
          </YStack>
        );
      })}
    </YStack>
  );
}
