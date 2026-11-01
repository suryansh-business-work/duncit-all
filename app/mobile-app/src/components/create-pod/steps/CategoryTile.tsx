import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { categoryTileName } from '@duncit/utils';

import { CategoryMark } from '@/components/CategoryMark';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { CreatePodHostCategory } from '../create-pod.types';

const PLATE = 38;
const MARK = 24;

interface Props {
  category: CreatePodHostCategory;
  /** The admin-set icon (Category Management); empty falls back to a generic mark. */
  icon: string;
  selected: boolean;
  /** Clubs this sub-category has where the pod would run; none disables the chip. */
  clubCount: number;
  testID: string;
  onPick: () => void;
}

/** One sub-category the host may run the pod in, as a chip: its icon on a plate
 * on the left, its name and how many clubs it has on the right.
 * mWeb twin: steps/CategoryTile. */
export function CategoryTile({
  category,
  icon,
  selected,
  clubCount,
  testID,
  onPick,
}: Readonly<Props>) {
  const { primary } = useThemeColors();
  const { t } = useTranslation();
  const name = categoryTileName(category);
  const empty = clubCount === 0;
  return (
    <XStack
      testID={testID}
      tabIndex={0}
      role="radio"
      aria-label={name}
      aria-checked={selected}
      aria-disabled={empty}
      onPress={empty ? undefined : onPick}
      minHeight={48}
      paddingLeft={4}
      paddingRight={12}
      gap={8}
      borderRadius={999}
      borderWidth={1}
      borderColor={selected ? '$primary' : '$borderColor'}
      backgroundColor={selected ? '$primarySoft' : '$soft'}
      opacity={empty ? 0.5 : 1}
      alignItems="center"
      pressStyle={empty ? undefined : PRESS_STYLE.control}
    >
      <YStack
        width={PLATE}
        height={PLATE}
        borderRadius={PLATE / 2}
        backgroundColor="$surface"
        alignItems="center"
        justifyContent="center"
        overflow="hidden"
      >
        <CategoryMark testID={`${testID}-mark`} icon={icon} size={MARK} tint={primary} />
      </YStack>
      <YStack>
        <Text fontSize={13} fontWeight="600" color="$color" numberOfLines={1}>
          {name}
        </Text>
        <Text fontSize={11} color="$muted" numberOfLines={1}>
          {empty
            ? t('mweb.createPod.categoryNoClubs')
            : t('mweb.createPod.categoryClubs', { count: clubCount })}
        </Text>
      </YStack>
    </XStack>
  );
}
