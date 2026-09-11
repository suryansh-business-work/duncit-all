import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface HomeFilterButtonProps {
  /** Number of active filters — shows a badge. */
  count?: number;
  /** Disabled when there are no clubs/pods to filter. */
  disabled?: boolean;
  onPress: () => void;
  /** Home's trigger: the 52px round green button beside the search bar.
   * Off = the "Filter" pill the full pod lists use. Twin of mWeb's FilterMenu
   * `round`. */
  round?: boolean;
}

/** The active-filter count, in an accent badge on the trigger's corner. */
function FilterBadge({ count }: Readonly<{ count: number }>) {
  return (
    <XStack
      testID="home-filter-badge"
      position="absolute"
      top={-2}
      right={-2}
      minWidth={18}
      height={18}
      borderRadius={999}
      paddingHorizontal={4}
      alignItems="center"
      justifyContent="center"
      backgroundColor="$accent"
    >
      <Text fontSize={10} fontWeight="700" color="$onPrimary">
        {count}
      </Text>
    </XStack>
  );
}

/** The filter trigger — Home's round green button, or the "Filter" pill. Both
 * open the same HomeFilterSheet through the caller's `onPress`. */
export function HomeFilterButton({
  count = 0,
  disabled,
  onPress,
  round = false,
}: Readonly<HomeFilterButtonProps>) {
  const { onPrimary, muted, color } = useThemeColors();
  const { t } = useTranslation();
  const showBadge = count > 0 && !disabled;
  const handlePress = () => {
    if (!disabled) onPress();
  };
  const a11y = {
    testID: 'home-filter-button',
    role: 'button',
    'aria-label': count > 0 ? `Open filters (${count} active)` : 'Open filters',
    'aria-disabled': disabled,
    onPress: handlePress,
    opacity: disabled ? 0.4 : 1,
  } as const;

  if (round) {
    return (
      <XStack
        {...a11y}
        width={52}
        height={52}
        borderRadius={26}
        alignItems="center"
        justifyContent="center"
        backgroundColor="$primary"
        pressStyle={disabled ? undefined : PRESS_STYLE.solid}
      >
        <MaterialIcons name="tune" size={24} color={onPrimary} />
        {showBadge ? <FilterBadge count={count} /> : null}
      </XStack>
    );
  }

  return (
    <XStack
      {...a11y}
      alignItems="center"
      justifyContent="center"
      gap={5}
      height={40}
      paddingHorizontal={14}
      borderRadius={999}
      borderWidth={1}
      borderColor="$cardBorder"
      backgroundColor="$surface"
      pressStyle={disabled ? undefined : PRESS_STYLE.control}
    >
      <MaterialIcons name="tune" size={16} color={disabled ? muted : color} />
      <Text fontSize={13} fontWeight="600" color="$color">
        {t('mweb.home.vibeFilter')}
      </Text>
      {showBadge ? <FilterBadge count={count} /> : null}
    </XStack>
  );
}
