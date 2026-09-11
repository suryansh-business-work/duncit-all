import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppImage } from '@/components/AppImage';

import { Text, YStack } from 'tamagui';

import { HeaderRoundButton } from '@/components/AppHeader/HeaderRoundButton';
import { useMe } from '@/hooks/useMe';
import type { RootStackParamList } from '@/navigation/types';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Header avatar that opens the account menu — the mobile twin of mWeb's header
 * <Avatar>, which navigates to the same /menu route (a real page on both, so
 * Back/refresh work). A 34px photo (or the user's initial) inside the header's
 * 40px round surface button.
 */
export function AccountButton() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data } = useMe();
  const me = data?.me;
  const initial = (me?.first_name?.[0] ?? me?.full_name?.[0] ?? 'U').toUpperCase();

  return (
    <HeaderRoundButton
      testID="account-button"
      label={t('mweb.common.openAccountMenu')}
      onPress={() => navigation.navigate('Menu')}
    >
      {me?.profile_photo ? (
        <AppImage
          testID="account-avatar-image"
          source={{ uri: me.profile_photo }}
          style={{ width: 34, height: 34, borderRadius: 17 }}
        />
      ) : (
        <YStack
          width={34}
          height={34}
          alignItems="center"
          justifyContent="center"
          borderRadius={17}
          backgroundColor="$primary"
        >
          <Text fontSize={14} fontWeight="600" color="$onPrimary">
            {initial}
          </Text>
        </YStack>
      )}
      {/* Online dot — presence marker on the signed-in avatar. */}
      {me ? (
        <YStack
          position="absolute"
          bottom={1}
          right={1}
          width={11}
          height={11}
          borderRadius={6}
          backgroundColor="$success"
          borderWidth={2}
          borderColor="$surface"
        />
      ) : null}
    </HeaderRoundButton>
  );
}
