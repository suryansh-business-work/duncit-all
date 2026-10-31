import { Text, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { categoryTileGroup, categoryTileName } from '@duncit/utils';

import { CategoryMark } from '@/components/CategoryMark';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { CreatePodHostCategory } from '../create-pod.types';

const PLATE = 60;
const MARK = 40;

interface Props {
  category: CreatePodHostCategory;
  /** The admin-set icon (Category Management); empty falls back to a generic mark. */
  icon: string;
  selected: boolean;
  testID: string;
  onPick: () => void;
}

/** One category the host may run the pod in: its real icon on a plate, its
 * name and its parent. mWeb twin: steps/CategoryTile. */
export function CategoryTile({ category, icon, selected, testID, onPick }: Readonly<Props>) {
  const { primary } = useThemeColors();
  const name = categoryTileName(category);
  return (
    <YStack
      testID={testID}
      tabIndex={0}
      role="radio"
      aria-label={name}
      aria-checked={selected}
      onPress={onPick}
      flex={1}
      minHeight={124}
      paddingVertical={12}
      paddingHorizontal={6}
      borderRadius={12}
      borderWidth={selected ? 2 : 1}
      borderColor={selected ? '$primary' : '$borderColor'}
      backgroundColor={selected ? '$primarySoft' : '$soft'}
      alignItems="center"
      justifyContent="center"
      gap={4}
      pressStyle={PRESS_STYLE.control}
    >
      <YStack
        width={PLATE}
        height={PLATE}
        borderRadius={PLATE / 2}
        backgroundColor="$surface"
        borderWidth={3}
        borderColor={selected ? '$primary' : '$surface'}
        alignItems="center"
        justifyContent="center"
        overflow="hidden"
        marginBottom={4}
      >
        <CategoryMark testID={`${testID}-mark`} icon={icon} size={MARK} tint={primary} />
      </YStack>
      <Text fontSize={13} fontWeight="600" color="$color" textAlign="center" numberOfLines={2}>
        {name}
      </Text>
      <Text fontSize={11} color="$muted" textAlign="center" numberOfLines={1}>
        {categoryTileGroup(category)}
      </Text>
    </YStack>
  );
}
