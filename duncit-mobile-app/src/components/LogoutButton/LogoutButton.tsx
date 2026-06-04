import { MaterialIcons } from '@expo/vector-icons';
import { XStack } from 'tamagui';

import { useLogout } from '@/hooks/useLogout';
import { useThemeColors } from '@/hooks/useThemeColors';

/** Clears the session and returns to login — mirrors mWeb's header logout. */
export function LogoutButton() {
  const onLogout = useLogout();
  const { color } = useThemeColors();

  return (
    <XStack
      testID="logout-button"
      role="button"
      aria-label="Logout"
      onPress={() => void onLogout()}
      width={40}
      height={40}
      alignItems="center"
      justifyContent="center"
      borderRadius={10}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      pressStyle={{ opacity: 0.8 }}
    >
      <MaterialIcons name="logout" size={20} color={color} />
    </XStack>
  );
}
