import type { ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import {
  isVerificationSettled,
  rejectReasonOf,
  STATUS_META,
  VERIFICATION_LABEL_KEYS,
  type VerificationTone,
} from '@duncit/verification';
import { Text, XStack, YStack } from 'tamagui';

import { SurfaceCard } from '@/components/SurfaceCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { Verification } from '@/hooks/useVerifications';

/** Status tone → the theme token its chip fills with — the same four colours
 * mWeb's MUI Chip reads (default / warning / success / error), but from the
 * live theme rather than fixed hex. */
const TONE_TOKEN: Record<VerificationTone, string> = {
  neutral: '$muted',
  pending: '$warning',
  success: '$success',
  error: '$danger',
};

/** Shared card shell for one verification type: check icon, title, status chip,
 * reject reason, and a body slot for the type-specific action.
 *
 * The status table, the labels and the settled/locked rules come from
 * @duncit/verification — the same ones mWeb and the partner console render
 * through their MUI cards (rules 27 and 40). */
export function VerificationCard({
  item,
  children,
}: Readonly<{ item: Verification; children?: ReactNode }>) {
  const { t } = useTranslation();
  const { muted, success } = useThemeColors();
  const meta = STATUS_META[item.status];
  const verified = isVerificationSettled(item.status);
  const reason = rejectReasonOf(item);

  return (
    <SurfaceCard testID={`verification-${item.type}`} gap={12}>
      <XStack alignItems="flex-start" gap={12}>
        <MaterialIcons name="check-circle" size={22} color={verified ? success : muted} />
        <YStack flex={1} gap={6}>
          <Text fontSize={16} fontWeight="600" color="$color">
            {t(VERIFICATION_LABEL_KEYS[item.type])}
          </Text>
          <XStack
            testID={`verification-status-${item.type}`}
            alignSelf="flex-start"
            height={24}
            paddingHorizontal={10}
            alignItems="center"
            borderRadius={999}
            backgroundColor={TONE_TOKEN[meta.tone]}
          >
            <Text fontSize={12} fontWeight="600" color="$onPrimary">
              {t(meta.labelKey)}
            </Text>
          </XStack>
          {reason ? (
            <Text fontSize={12} color="$danger">
              {reason}
            </Text>
          ) : null}
        </YStack>
      </XStack>
      {children}
    </SurfaceCard>
  );
}
