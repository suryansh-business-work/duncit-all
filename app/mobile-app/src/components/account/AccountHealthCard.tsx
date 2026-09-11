import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { HealthMeter } from '@/components/health';
import { SurfaceCard } from '@/components/SurfaceCard';
import type { AccountHealth } from '@/hooks/useAccount';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

const BAND_MESSAGE: Record<string, string> = {
  GREEN: 'You’re in great shape.',
  YELLOW: 'A few things to tighten up.',
  RED: 'Needs attention.',
};

/** Account-health summary — the gauge, the band message and the base/admin
 * breakdown. RN twin of mWeb's AccountHealthSummary. The whole card opens the
 * full Account Health detail, so it carries a chevron, not a caption. */
export function AccountHealthCard({
  health,
  onPress,
}: Readonly<{
  health: AccountHealth;
  onPress?: () => void;
}>) {
  const { t } = useTranslation();
  const { muted } = useThemeColors();
  const remarks = health.adjustments.length;
  const deltaText = health.delta_sum > 0 ? `+${health.delta_sum}` : `${health.delta_sum}`;
  const adjustment = health.delta_sum === 0 ? '' : ` · Admin adjustment: ${deltaText}`;

  return (
    <SurfaceCard
      testID="account-health"
      role={onPress ? 'button' : undefined}
      aria-label={onPress ? 'Open account health' : undefined}
      onPress={onPress}
      pressStyle={onPress ? PRESS_STYLE.surface : undefined}
    >
      <XStack alignItems="center" gap={16}>
        <HealthMeter
          score={health.total_score}
          band={health.band}
          size={112}
          thickness={10}
          label={t('mweb.common.accountHealth')}
        />
        <YStack flex={1} gap={2}>
          <Text fontSize={16} fontWeight="600" color="$color">
            {BAND_MESSAGE[health.band] ?? 'Account health'}
          </Text>
          <Text fontSize={14} color="$muted">
            Base score: {health.base_score}
            {adjustment}
          </Text>
          {remarks > 0 ? (
            <Text fontSize={12} color="$muted">
              {remarks} admin remark{remarks === 1 ? '' : 's'}.
            </Text>
          ) : null}
        </YStack>
        {onPress ? <MaterialIcons name="chevron-right" size={22} color={muted} /> : null}
      </XStack>
    </SurfaceCard>
  );
}
