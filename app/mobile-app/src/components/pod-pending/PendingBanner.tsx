import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { SurfaceCard } from '@/components/SurfaceCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { pendingBannerState } from '@/utils/pod-pending';

/** Top card of the waiting screen — the venue decision's tick on a soft disc
 * (amber pending, green approved, red declined) beside the matching heading and
 * its one line. mWeb twin (rule 27). */
export function PendingBanner({ status }: Readonly<{ status: string }>) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const banner = pendingBannerState(status, t);
  const tone = { warning: colors.warning, success: colors.success, error: colors.danger }[
    banner.tone
  ];

  return (
    <SurfaceCard testID="pod-pending-banner">
      <XStack gap={12} alignItems="flex-start">
        <YStack
          width={44}
          height={44}
          borderRadius={22}
          alignItems="center"
          justifyContent="center"
          backgroundColor="$soft"
        >
          <MaterialIcons name={banner.icon} size={24} color={tone} />
        </YStack>
        <YStack flex={1} gap={4}>
          <Text fontSize={16} fontWeight="600" color="$color">
            {banner.title}
          </Text>
          <Text fontSize={13} color="$muted" lineHeight={18}>
            {banner.body}
          </Text>
        </YStack>
      </XStack>
    </SurfaceCard>
  );
}
