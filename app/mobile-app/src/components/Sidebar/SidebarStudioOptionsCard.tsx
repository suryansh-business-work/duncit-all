import { MaterialIcons } from '@expo/vector-icons';
import { Text, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';
import type { StudioOptionsEntry } from '@duncit/utils';

import { SurfaceCard } from '@/components/SurfaceCard';
import { studioRoute } from '@/components/studio-options/studioOptionTarget';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { MenuRoute } from '@/navigation/types';

/**
 * The ONE highlighted sidebar entry of the studio the user is switched into —
 * "Venue Options", "Host Options", … with its hint — opening that studio's
 * Options page. Tinted with the primary tokens so it reads as the way into the
 * studio, in the shape of the Coin and Referral cards. mWeb twin:
 * profile-drawer/StudioOptionsCard.
 */
export function SidebarStudioOptionsCard({
  entry,
  onNavigate,
}: Readonly<{ entry: StudioOptionsEntry; onNavigate: (route: MenuRoute) => void }>) {
  const { t } = useTranslation();
  const { onPrimary, primary } = useThemeColors();
  const title = t(entry.labelKey);
  const hint = t(entry.hintKey);
  return (
    <YStack paddingHorizontal={16} paddingBottom={12}>
      <SurfaceCard
        testID="sidebar-studio-options"
        role="button"
        aria-label={title}
        accessibilityHint={hint}
        tabIndex={0}
        onPress={() => onNavigate(studioRoute(entry.route))}
        flexDirection="row"
        alignItems="center"
        gap={12}
        backgroundColor="$primarySoft"
        borderColor="$primary"
        pressStyle={PRESS_STYLE.surface}
      >
        <YStack
          width={44}
          height={44}
          alignItems="center"
          justifyContent="center"
          borderRadius={22}
          backgroundColor="$primary"
        >
          <MaterialIcons name="tune" size={22} color={onPrimary} />
        </YStack>
        <YStack flex={1} minWidth={0} gap={2}>
          <Text numberOfLines={1} fontSize={15} fontWeight="700" color="$color">
            {title}
          </Text>
          {/* `$color`, not `$muted`: the tinted ground would sink muted text
              below 4.5:1. The weight carries the hierarchy instead. */}
          <Text numberOfLines={2} fontSize={12} color="$color">
            {hint}
          </Text>
        </YStack>
        <MaterialIcons name="chevron-right" size={22} color={primary} />
      </SurfaceCard>
    </YStack>
  );
}
