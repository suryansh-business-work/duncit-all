import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, useTheme } from 'tamagui';

import { MOBILE } from '@/constants/design';
import { haptics } from '@/services/haptics';
import type { IconName } from './EmptyState';

interface Props {
  icon: IconName;
  label: string;
  onPress: () => void;
  testID?: string;
}

/**
 * The screen's main action, floating at the bottom right under the thumb
 * (Material's extended FAB): an icon and a short label, the accent fill.
 */
export function Fab({ icon, label, onPress, testID }: Readonly<Props>) {
  const theme = useTheme();
  return (
    <XStack
      role="button"
      aria-label={label}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      position="absolute"
      right={MOBILE.gutter}
      bottom={MOBILE.gutter}
      height={MOBILE.fab}
      paddingHorizontal="$4"
      borderRadius={MOBILE.fab / 2}
      backgroundColor="$primary"
      alignItems="center"
      gap="$2"
      shadowColor="$primary"
      shadowOpacity={0.3}
      shadowRadius={8}
      shadowOffset={{ width: 0, height: 4 }}
      elevation={4}
      pressStyle={{ backgroundColor: '$primaryPress' }}
      testID={testID}
    >
      <MaterialIcons name={icon} size={MOBILE.icon} color={theme.onPrimary?.val} />
      <Text color="$onPrimary" fontWeight="700">
        {label}
      </Text>
    </XStack>
  );
}
