import { Text, XStack, YStack } from 'tamagui';

interface Props {
  /** Monday-first initials from `weekdayInitials`, each with a stable id. */
  initials: readonly { id: string; label: string }[];
}

/** The weekday initials over a hand-drawn month grid — one header for the
 * slot picker and the availability calendar, so the two cannot drift. */
export function WeekdayHeader({ initials }: Readonly<Props>) {
  return (
    <XStack>
      {initials.map((weekday) => (
        <YStack key={weekday.id} flex={1} alignItems="center" paddingVertical={4}>
          <Text fontSize={11} fontWeight="700" color="$muted">
            {weekday.label}
          </Text>
        </YStack>
      ))}
    </XStack>
  );
}
