import type { ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { semantic } from '@duncit/auth-tokens';
import {
  isVerificationSettled,
  rejectReasonOf,
  STATUS_META,
  TONE_HEX,
  VERIFICATION_LABEL_KEYS,
} from '@duncit/verification';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { Verification } from '@/hooks/useVerifications';

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
  const { muted } = useThemeColors();
  const meta = STATUS_META[item.status];
  const verified = isVerificationSettled(item.status);
  const reason = rejectReasonOf(item);

  return (
    <YStack
      testID={`verification-${item.type}`}
      gap={12}
      padding={14}
      borderRadius={14}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      <XStack alignItems="center" gap={12}>
        <MaterialIcons name="check-circle" size={22} color={verified ? semantic.success : muted} />
        <YStack flex={1} gap={4}>
          <Text fontSize={14.5} fontWeight="700" color="$color">
            {t(VERIFICATION_LABEL_KEYS[item.type])}
          </Text>
          <XStack
            testID={`verification-status-${item.type}`}
            alignSelf="flex-start"
            paddingHorizontal={8}
            paddingVertical={2}
            borderRadius={999}
            backgroundColor={TONE_HEX[meta.tone]}
          >
            <Text fontSize={11} fontWeight="700" color="$onPrimary">
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
    </YStack>
  );
}
