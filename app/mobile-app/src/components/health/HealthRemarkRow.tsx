import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { DISABLED_OPACITY } from '@duncit/buttons-native';
import { semantic } from '@duncit/auth-tokens';
import {
  HEALTH_APPEAL_STATUS_KEY,
  healthAppealStateOf,
  type FulfilmentTone,
  type HealthAppealStatus,
} from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { ToneChip } from '@/components/brand-orders/ToneChip';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { adjustmentSign, type HealthAdjustmentLike } from '@/utils/health';
import { formatDateTime, formatRelative } from '@/utils/date-format';

/** The shared tone each appeal status reads in — mWeb's HEALTH_APPEAL_STATUS_COLOR. */
const APPEAL_TONE: Readonly<Record<HealthAppealStatus, FulfilmentTone>> = {
  PENDING: 'pending',
  ACCEPTED: 'done',
  DENIED: 'neutral',
};

interface Props {
  adjustment: HealthAdjustmentLike;
  onAppeal: (adjustment: HealthAdjustmentLike) => void;
}

/**
 * One line of the health history — RN twin of mWeb's <HealthRemarkRow/>. A
 * deduction that still counts offers Appeal; once appealed, the row says where
 * the appeal stands. A deduction lifted on appeal is faded and struck through,
 * while its "Appeal accepted" chip stays at full strength to say why.
 */
export function HealthRemarkRow({ adjustment, onAppeal }: Readonly<Props>) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const positive = adjustment.delta > 0;
  const appeal = healthAppealStateOf(adjustment);
  const points = Math.abs(adjustment.delta);

  return (
    <XStack
      testID={`health-remark-${adjustment.id}`}
      gap={12}
      alignItems="center"
      paddingHorizontal={16}
      paddingVertical={14}
    >
      <XStack
        flex={1}
        gap={12}
        alignItems="center"
        opacity={adjustment.waived ? DISABLED_OPACITY : 1}
        testID={adjustment.waived ? `health-remark-waived-${adjustment.id}` : undefined}
      >
        <XStack
          minWidth={44}
          justifyContent="center"
          borderRadius={999}
          paddingHorizontal={10}
          paddingVertical={4}
          backgroundColor={positive ? semantic.success : semantic.error}
        >
          <Text
            fontSize={12}
            fontWeight="600"
            color="white"
            textDecorationLine={adjustment.waived ? 'line-through' : 'none'}
          >
            {adjustmentSign(adjustment.delta)}
          </Text>
        </XStack>
        <YStack flex={1}>
          <Text fontSize={14} fontWeight="500" color="$color">
            {adjustment.remark}
          </Text>
          <Text fontSize={12} color="$muted">
            {adjustment.created_by_name} · {formatDateTime(adjustment.created_at)} ·{' '}
            {formatRelative(adjustment.created_at)} ago
          </Text>
        </YStack>
      </XStack>
      {appeal === 'APPEALABLE' ? (
        <DuncitButton
          testID={`health-appeal-${adjustment.id}`}
          label={t('healthAppeal.appeal')}
          accessibilityLabel={t('healthAppeal.appealNamed', { vars: { points } })}
          onPress={() => onAppeal(adjustment)}
          variant="outline"
          size="sm"
          icon={<MaterialIcons name="gavel" size={16} color={colors.primary} />}
        />
      ) : null}
      {appeal && appeal !== 'APPEALABLE' ? (
        <ToneChip
          testID={`health-appeal-status-${adjustment.id}`}
          label={t(HEALTH_APPEAL_STATUS_KEY[appeal])}
          tone={APPEAL_TONE[appeal]}
        />
      ) : null}
    </XStack>
  );
}
