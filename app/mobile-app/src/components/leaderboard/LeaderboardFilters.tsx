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

type ChipTone = '$onPrimary' | '$color';

function FilterChip({
  label,
  selected,
  testID,
  onPress,
}: Readonly<{ label: string; selected: boolean; testID: string; onPress: () => void }>) {
  const ink: ChipTone = selected ? '$onPrimary' : '$color';
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      onPress={onPress}
      paddingHorizontal={14}
      paddingVertical={8}
      borderRadius={999}
      borderWidth={1}
      backgroundColor={selected ? '$primary' : '$surface'}
      borderColor={selected ? '$primary' : '$borderColor'}
      pressStyle={{ opacity: 0.8 }}
    >
      <Text fontSize={13} fontWeight="700" color={ink}>
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

/** This month / this year / all time. */
export function LeaderboardPeriodToggle({
  value,
  onChange,
}: Readonly<{ value: LeaderboardPeriodKey; onChange: (next: LeaderboardPeriodKey) => void }>) {
  const { t } = useTranslation();
  return (
    <XStack paddingHorizontal={16} gap={8}>
      {LEADERBOARD_PERIODS.map((period) => (
        <FilterChip
          key={period}
          testID={`leaderboard-period-${period}`}
          label={t(LEADERBOARD_PERIOD_KEY[period])}
          selected={period === value}
          onPress={() => onChange(period)}
        />
      ))}
    </XStack>
  );
}
