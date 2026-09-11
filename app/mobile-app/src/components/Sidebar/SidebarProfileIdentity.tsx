import { MaterialIcons } from '@expo/vector-icons';
import { Text, YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

export interface SidebarIdentityUser {
  full_name?: string | null;
  first_name?: string | null;
  email?: string | null;
  profile_photo?: string | null;
}

const AVATAR = 52;

/** The profile header card — a round avatar, the name at 18/600 and the email
 * muted under it, with a chevron; the whole card opens the profile. RN port of
 * mWeb's <ProfileIdentity/>. */
export function SidebarProfileIdentity({
  me,
  onPress,
}: Readonly<{ me?: SidebarIdentityUser | null; onPress: () => void }>) {
  const { t } = useTranslation();
  const { muted } = useThemeColors();
  const initial = (me?.first_name?.[0] ?? me?.full_name?.[0] ?? 'U').toUpperCase();

  return (
    <YStack paddingHorizontal={16} paddingBottom={12}>
      <SurfaceCard
        testID="sidebar-identity"
        role="button"
        aria-label={t('mweb.common.openYourProfile')}
        onPress={onPress}
        flexDirection="row"
        alignItems="center"
        gap={14}
        pressStyle={PRESS_STYLE.surface}
      >
        {me?.profile_photo ? (
          <AppImage
            source={{ uri: me.profile_photo }}
            style={{ width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2 }}
          />
        ) : (
          <YStack
            width={AVATAR}
            height={AVATAR}
            alignItems="center"
            justifyContent="center"
            borderRadius={AVATAR / 2}
            backgroundColor="$primary"
          >
            <Text fontSize={20} fontWeight="600" color="$onPrimary">
              {initial}
            </Text>
          </YStack>
        )}
        <YStack flex={1} minWidth={0} gap={2}>
          <Text numberOfLines={1} fontSize={18} fontWeight="600" color="$color">
            {me?.full_name ?? 'User'}
          </Text>
          {me?.email ? (
            <Text numberOfLines={1} fontSize={13} color="$muted">
              {me.email}
            </Text>
          ) : null}
        </YStack>
        <MaterialIcons name="chevron-right" size={22} color={muted} />
      </SurfaceCard>
    </YStack>
  );
}
