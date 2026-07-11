import { Text, XStack, YStack } from 'tamagui';

/** "Your profile is incomplete" nudge — RN port of mWeb's <IncompleteBanner/>.
 * Shown when profile completion < 100%; the dark pill opens Account. */
export function SidebarIncompleteBanner({
  percent,
  onComplete,
}: Readonly<{ percent: number; onComplete: () => void }>) {
  return (
    <YStack paddingHorizontal={16} paddingBottom={10}>
      <XStack
        testID="profile-completion"
        alignItems="center"
        justifyContent="space-between"
        gap={12}
        borderRadius={10}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$surface"
        paddingHorizontal={14}
        paddingVertical={10}
      >
        <XStack flex={1} alignItems="center" gap={10}>
          <YStack width={8} height={8} borderRadius={4} backgroundColor="$primary" />
          <YStack flex={1}>
            <Text numberOfLines={1} fontSize={13.5} fontWeight="800" color="$color">
              Your profile is incomplete
            </Text>
            <Text fontSize={12} color="$muted">
              {percent}% complete
            </Text>
          </YStack>
        </XStack>
        <XStack
          testID="profile-completion-cta"
          role="button"
          aria-label="Complete your profile"
          onPress={onComplete}
          borderRadius={999}
          backgroundColor="$color"
          paddingHorizontal={14}
          paddingVertical={7}
          pressStyle={{ opacity: 0.85 }}
        >
          <Text fontSize={12.5} fontWeight="800" color="$background">
            Complete
          </Text>
        </XStack>
      </XStack>
    </YStack>
  );
}
