import { MaterialIcons } from '@expo/vector-icons';
import { Text, YStack } from 'tamagui';

import { SurfaceCard } from '@/components/SurfaceCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { MenuRoute } from '@/navigation/types';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { REFERRAL_TILE } from './profileSections';

/** Full-width "Refer & Earn" featured card — RN port of mWeb's <ReferralCard/>.
 * An accent gift on a soft disc and the label; the title says it all. */
export function SidebarReferralCard({
  onNavigate,
}: Readonly<{ onNavigate: (route: MenuRoute) => void }>) {
  const { accent, muted } = useThemeColors();
  return (
    <YStack paddingHorizontal={16} paddingBottom={12}>
      <SurfaceCard
        testID="sidebar-referral"
        role="button"
        aria-label={REFERRAL_TILE.label}
        onPress={() => onNavigate(REFERRAL_TILE.route)}
        flexDirection="row"
        alignItems="center"
        gap={12}
        pressStyle={PRESS_STYLE.surface}
      >
        <YStack
          width={44}
          height={44}
          alignItems="center"
          justifyContent="center"
          borderRadius={22}
          backgroundColor="$soft"
        >
          <MaterialIcons name={REFERRAL_TILE.icon} size={22} color={accent} />
        </YStack>
        <Text flex={1} numberOfLines={1} fontSize={15} fontWeight="600" color="$color">
          {REFERRAL_TILE.label}
        </Text>
        <MaterialIcons name="chevron-right" size={20} color={muted} />
      </SurfaceCard>
    </YStack>
  );
}
