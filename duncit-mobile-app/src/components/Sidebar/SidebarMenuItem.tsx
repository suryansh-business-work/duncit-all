import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import type { MenuItem } from '@/hooks/useMenuItems';
import { useThemeColors } from '@/hooks/useThemeColors';

/** A single tappable row in the account drawer — RN port of mWeb's MenuItemRow. */
export function SidebarMenuItem({ item, onPress }: { item: MenuItem; onPress: () => void }) {
  const { primary } = useThemeColors();

  return (
    <XStack
      testID={`sidebar-item-${item.label}`}
      role="button"
      aria-label={item.label}
      onPress={onPress}
      marginHorizontal={8}
      marginVertical={2}
      alignItems="center"
      gap={12}
      borderRadius={10}
      paddingHorizontal={12}
      paddingVertical={12}
      pressStyle={{ opacity: 0.7 }}
    >
      <MaterialIcons name={item.icon} size={20} color={primary} />
      <Text fontSize={14} fontWeight="800" color="$color">
        {item.label}
      </Text>
    </XStack>
  );
}
