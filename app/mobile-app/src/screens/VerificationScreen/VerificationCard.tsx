import type { ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import type { Verification } from '@/hooks/useVerifications';

import { LABELS, STATUS_META } from './labels';

const DONE = new Set(['APPROVED', 'VERIFIED_BY_APP']);

/** Shared card shell for one verification type: check icon, title, status chip,
 * reject reason, and a body slot for the type-specific action. */
export function VerificationCard({
  item,
  children,
}: Readonly<{ item: Verification; children?: ReactNode }>) {
  const meta = STATUS_META[item.status];
  const verified = DONE.has(item.status);

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
        <MaterialIcons name="check-circle" size={22} color={verified ? '#22c55e' : '#cfd2d6'} />
        <YStack flex={1} gap={4}>
          <Text fontSize={14.5} fontWeight="900" color="$color">
            {LABELS[item.type]}
          </Text>
          <XStack
            testID={`verification-status-${item.type}`}
            alignSelf="flex-start"
            paddingHorizontal={8}
            paddingVertical={2}
            borderRadius={999}
            backgroundColor={meta.color}
          >
            <Text fontSize={11} fontWeight="900" color="#ffffff">
              {meta.label}
            </Text>
          </XStack>
          {item.status === 'REJECTED' && item.reject_reason ? (
            <Text fontSize={12} color="$danger">
              {item.reject_reason}
            </Text>
          ) : null}
        </YStack>
      </XStack>
      {children}
    </YStack>
  );
}
