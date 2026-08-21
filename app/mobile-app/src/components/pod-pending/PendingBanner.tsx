import { MaterialIcons } from '@expo/vector-icons';
import { semantic } from '@duncit/auth-tokens';
import { Text, YStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';
import { pendingBannerState, type ApprovalTone } from '@/utils/pod-pending';

const TONE_COLORS: Record<ApprovalTone, string> = {
  warning: semantic.warning,
  success: semantic.success,
  error: semantic.error,
};

/** Top banner of the waiting screen — a big tick in the venue decision's colour
 * (amber pending, green approved, red declined) over the matching heading and
 * subheading, top-center aligned. mWeb twin (rule 27). */
export function PendingBanner({ status }: Readonly<{ status: string }>) {
  const { t } = useTranslation();
  const banner = pendingBannerState(status, t);

  return (
    <YStack testID="pod-pending-banner" alignItems="center" gap={10} paddingVertical={16}>
      <MaterialIcons name={banner.icon} size={64} color={TONE_COLORS[banner.tone]} />
      <Text fontSize={17} fontWeight="700" color="$color" textAlign="center">
        {banner.title}
      </Text>
      <Text fontSize={13} color="$muted" textAlign="center">
        {banner.body}
      </Text>
    </YStack>
  );
}
