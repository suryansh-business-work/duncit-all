import { Text, XStack, YStack } from 'tamagui';

import { profileCompletion, type ProfileForCompletion } from '@/utils/profile-completion';

export interface CompletionMeterProps {
  profile: ProfileForCompletion;
}

/** Small read-only "profile completion" meter shown on the Account screen.
 * Computes the percentage via the shared pure helper (RN twin of mWeb's
 * CompletionMeter). No backend write. */
export function CompletionMeter({ profile }: Readonly<CompletionMeterProps>) {
  const percent = profileCompletion(profile);

  return (
    <YStack testID="profile-completion" gap={6}>
      <XStack alignItems="center" justifyContent="space-between">
        <Text fontSize={13} fontWeight="800" color="$color">
          Profile completion
        </Text>
        <Text fontSize={13} color="$muted" testID="profile-completion-value">
          {percent}% complete
        </Text>
      </XStack>
      <YStack
        height={8}
        borderRadius={4}
        backgroundColor="$borderColor"
        accessibilityLabel="Profile completion"
        overflow="hidden"
      >
        <YStack height={8} borderRadius={4} backgroundColor="$primary" width={`${percent}%`} />
      </YStack>
    </YStack>
  );
}
