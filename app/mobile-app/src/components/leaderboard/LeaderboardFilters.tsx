import { ScrollView } from 'react-native';
import { Text, XStack } from 'tamagui';

import {
  LEADERBOARD_CATEGORIES,
  LEADERBOARD_PERIODS,
  LEADERBOARD_PERIOD_KEY,
  LEADERBOARD_TAB_KEY,
  type LeaderboardCategory,
  type LeaderboardPeriodKey,
} from '@duncit/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

type ChipTone = '$onPrimary' | '$color';

interface ChipProps {
  label: string;
  selected: boolean;
  testID: string;
  onPress: () => void;
  /** Segments share the track's width; chips size to their label. */
  segment?: boolean;
}

function FilterChip({ label, selected, testID, onPress, segment = false }: Readonly<ChipProps>) {
  const ink: ChipTone = selected ? '$onPrimary' : '$color';
  const rest = segment ? 'transparent' : '$surface';
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      onPress={onPress}
      flex={segment ? 1 : undefined}
      height={36}
      alignItems="center"
      justifyContent="center"
      paddingHorizontal={14}
      borderRadius={999}
      backgroundColor={selected ? '$primary' : rest}
      pressStyle={PRESS_STYLE.control}
    >
      <Text fontSize={13} fontWeight="600" color={ink} numberOfLines={1}>
        {label}
      </Text>
    </XStack>
  );
}

/** The five board tabs — a horizontally scrolling chip row. */
export function LeaderboardCategoryTabs({
  value,
  onChange,
}: Readonly<{ value: LeaderboardCategory; onChange: (next: LeaderboardCategory) => void }>) {
  const { t } = useTranslation();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
    >
      {LEADERBOARD_CATEGORIES.map((category) => (
        <FilterChip
          key={category}
          testID={`leaderboard-tab-${category}`}
          label={t(LEADERBOARD_TAB_KEY[category])}
          selected={category === value}
          onPress={() => onChange(category)}
        />
      ))}
    </ScrollView>
  );
}

/** This month / this year / all time — a pill segmented control: a soft
 * track, the chosen window a green pill. mWeb twin: the page's toggle group. */
export function LeaderboardPeriodToggle({
  value,
  onChange,
}: Readonly<{ value: LeaderboardPeriodKey; onChange: (next: LeaderboardPeriodKey) => void }>) {
  const { t } = useTranslation();
  return (
    <XStack marginHorizontal={16} padding={4} gap={4} borderRadius={999} backgroundColor="$soft">
      {LEADERBOARD_PERIODS.map((period) => (
        <FilterChip
          key={period}
          segment
          testID={`leaderboard-period-${period}`}
          label={t(LEADERBOARD_PERIOD_KEY[period])}
          selected={period === value}
          onPress={() => onChange(period)}
        />
      ))}
    </XStack>
  );
}
