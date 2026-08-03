import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface HomeFilterButtonProps {
  /** Number of active filters — shows a badge. */
  count?: number;
  /** Disabled when there are no clubs/pods to filter. */
  disabled?: boolean;
  onPress: () => void;
}

/** The mock's "Filter" pill — icon + label — shown in the "What's your vibe
 * today?" header. Twin of mWeb's FilterMenu trigger. */
export function HomeFilterButton({
  count = 0,
  disabled,
  onPress,
}: Readonly<HomeFilterButtonProps>) {
  const { primary, muted } = useThemeColors();
  const { t } = useTranslation();
  const showBadge = count > 0 && !disabled;
  const handlePress = () => {
    if (!disabled) onPress();
  };
  return (
    <XStack
      testID="home-filter-button"
      role="button"
      aria-label={count > 0 ? `Open filters (${count} active)` : 'Open filters'}
      aria-disabled={disabled}
      onPress={handlePress}
      alignItems="center"
      justifyContent="center"
      gap={5}
      height={38}
      paddingHorizontal={14}
      borderRadius={999}
      borderWidth={1.5}
      borderColor="$borderColor"
      backgroundColor="$surface"
      opacity={disabled ? 0.4 : 1}
      pressStyle={disabled ? undefined : { opacity: 0.8 }}
    >
      <MaterialIcons name="tune" size={16} color={disabled ? muted : primary} />
      <Text fontSize={12.5} fontWeight="600" color="$color">
        {t('mweb.home.vibeFilter')}
      </Text>
      {showBadge ? (
        <XStack
          testID="home-filter-badge"
          position="absolute"
          top={-4}
          right={-4}
          minWidth={16}
          height={16}
          borderRadius={999}
          paddingHorizontal={4}
          alignItems="center"
          justifyContent="center"
          backgroundColor="$primary"
        >
          <Text fontSize={9} fontWeight="700" color="$onPrimary">
            {count}
          </Text>
        </XStack>
      ) : null}
    </XStack>
  );
}
