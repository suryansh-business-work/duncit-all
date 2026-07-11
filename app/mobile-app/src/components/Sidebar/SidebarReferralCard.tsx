import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import type { MenuRoute } from '@/navigation/types';
import { REFERRAL_TILE } from './profileSections';

/** Green-tinted gift chip background — mirrors mWeb's rgba(34,197,94,0.14). */
const GREEN_CHIP = 'rgba(34,197,94,0.14)';

/** Full-width "Refer & Earn" featured card — RN port of mWeb's <ReferralCard/>. */
export function SidebarReferralCard({
  onNavigate,
}: Readonly<{ onNavigate: (route: MenuRoute) => void }>) {
  const { success, muted } = useThemeColors();
  return (
    <YStack paddingHorizontal={16} paddingBottom={10}>
      <XStack
        testID="sidebar-referral"
        role="button"
        aria-label={REFERRAL_TILE.label}
        onPress={() => onNavigate(REFERRAL_TILE.route)}
        alignItems="center"
        gap={12}
        borderRadius={12}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$surface"
        padding={12}
        pressStyle={{ opacity: 0.85, borderColor: '$success' }}
      >
        <YStack
          width={44}
          height={44}
          alignItems="center"
          justifyContent="center"
          borderRadius={10}
          backgroundColor={GREEN_CHIP}
        >
          <MaterialIcons name={REFERRAL_TILE.icon} size={22} color={success} />
        </YStack>
        <YStack flex={1}>
          <Text numberOfLines={1} fontSize={14} fontWeight="800" color="$color">
            {REFERRAL_TILE.label}
          </Text>
          <Text numberOfLines={1} fontSize={12} color="$muted">
            {REFERRAL_TILE.caption}
          </Text>
        </YStack>
        <MaterialIcons name="chevron-right" size={20} color={muted} />
      </XStack>
    </YStack>
  );
}
