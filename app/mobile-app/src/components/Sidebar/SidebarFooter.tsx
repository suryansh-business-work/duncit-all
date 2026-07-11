import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { semantic } from '@duncit/auth-tokens';

import { appVersion } from '@/utils/app-version';

/** Logout footer + app version — RN port of mWeb's <DrawerFooter/>. */
export function SidebarFooter({ onLogout }: Readonly<{ onLogout: () => void }>) {
  const version = appVersion();
  return (
    <YStack borderTopWidth={1} borderColor="$borderColor" padding={12}>
      <XStack
        testID="sidebar-logout"
        role="button"
        aria-label="Logout"
        onPress={onLogout}
        alignItems="center"
        justifyContent="center"
        gap={8}
        borderRadius={999}
        borderWidth={1}
        borderColor="$danger"
        paddingHorizontal={16}
        paddingVertical={12}
        pressStyle={{ opacity: 0.8 }}
      >
        <MaterialIcons name="logout" size={18} color={semantic.error} />
        <Text fontSize={14} fontWeight="800" color="$danger">
          Logout
        </Text>
      </XStack>
      <Text
        testID="sidebar-app-version"
        fontSize={11}
        color="$muted"
        textAlign="center"
        paddingTop={8}
      >
        App version {version}
      </Text>
    </YStack>
  );
}
