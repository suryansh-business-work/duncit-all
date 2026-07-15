import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppImage } from '@/components/AppImage';

import { Text, XStack, YStack } from 'tamagui';

import { useMe } from '@/hooks/useMe';
import type { RootStackParamList } from '@/navigation/types';

/**
 * Header avatar that opens the account drawer — the mobile twin of mWeb's
 * header <Avatar> + <ProfileDrawer> pair. Navigates to the routable /menu
 * overlay (so Back/refresh work). Falls back to the user's initial.
 */
export function AccountButton() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data } = useMe();
  const me = data?.me;
  const initial = (me?.first_name?.[0] ?? me?.full_name?.[0] ?? 'U').toUpperCase();

  return (
    <XStack
      testID="account-button"
      role="button"
      aria-label="Open account menu"
      onPress={() => navigation.navigate('Menu')}
      width={40}
      height={40}
      alignItems="center"
      justifyContent="center"
    >
      {me?.profile_photo ? (
        <AppImage
          testID="account-avatar-image"
          source={{ uri: me.profile_photo }}
          style={{ width: 34, height: 34, borderRadius: 17 }}
        />
      ) : (
        <YStack
          width={36}
          height={36}
          alignItems="center"
          justifyContent="center"
          borderRadius={18}
          backgroundColor="$primary"
        >
          <Text fontSize={14} fontWeight="800" color="$onPrimary">
            {initial}
          </Text>
        </YStack>
      )}
    </XStack>
  );
}
