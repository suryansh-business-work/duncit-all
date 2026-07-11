import { MaterialIcons } from '@expo/vector-icons';
import { Separator, Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import type { MenuRoute } from '@/navigation/types';
import type { ProfileTile } from './profileSections';

function ManageRow({
  item,
  showDivider,
  onNavigate,
}: Readonly<{ item: ProfileTile; showDivider: boolean; onNavigate: (route: MenuRoute) => void }>) {
  const { muted } = useThemeColors();
  return (
    <YStack>
      <XStack
        testID={`sidebar-item-${item.label}`}
        role="button"
        aria-label={item.label}
        onPress={() => onNavigate(item.route)}
        alignItems="center"
        gap={12}
        paddingHorizontal={14}
        paddingVertical={9}
        pressStyle={{ opacity: 0.8 }}
      >
        <MaterialIcons name={item.icon} size={20} color={muted} />
        <Text flex={1} fontSize={14} fontWeight="700" color="$color">
          {item.label}
        </Text>
        <MaterialIcons name="chevron-right" size={20} color={muted} />
      </XStack>
      {showDivider ? <Separator borderColor="$borderColor" /> : null}
    </YStack>
  );
}

/** "Manage Account" grouped list — RN port of mWeb's <ManageAccountList/>. */
export function SidebarManageList({
  items,
  onNavigate,
}: Readonly<{ items: ProfileTile[]; onNavigate: (route: MenuRoute) => void }>) {
  return (
    <YStack paddingHorizontal={16} paddingBottom={10} gap={4}>
      <Text
        fontSize={11}
        fontWeight="800"
        letterSpacing={0.4}
        textTransform="uppercase"
        color="$muted"
        paddingLeft={2}
      >
        Manage Account
      </Text>
      <YStack
        borderRadius={12}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$surface"
        overflow="hidden"
      >
        {items.map((item, index) => (
          <ManageRow
            key={item.key}
            item={item}
            showDivider={index < items.length - 1}
            onNavigate={onNavigate}
          />
        ))}
      </YStack>
    </YStack>
  );
}
