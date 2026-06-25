import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  /** Resolved/closed ticket within the reopen window. */
  reopenable: boolean;
  /** Resolved/closed ticket whose reopen window has passed. */
  expired: boolean;
  deadlineLabel: string;
  onReopen: () => void;
}

/** Reopen action (within window) or the expired note for a resolved ticket (Bug 3/11). */
export function TicketReopenFooter({
  reopenable,
  expired,
  deadlineLabel,
  onReopen,
}: Readonly<Props>) {
  const { color: ink } = useThemeColors();

  if (reopenable) {
    return (
      <YStack margin={12} marginBottom={0} gap={4}>
        <XStack
          testID="ticket-reopen"
          role="button"
          aria-label="Re-open ticket"
          onPress={onReopen}
          height={42}
          alignItems="center"
          justifyContent="center"
          gap={8}
          borderRadius={999}
          borderWidth={1}
          borderColor="$primary"
          pressStyle={{ opacity: 0.85 }}
        >
          <MaterialIcons name="replay" size={18} color={ink} />
          <Text fontSize={13} fontWeight="800" color="$primary">
            Re-open ticket
          </Text>
        </XStack>
        {deadlineLabel ? (
          <Text testID="ticket-reopen-until" fontSize={11} color="$muted" textAlign="center">
            You can reopen until {deadlineLabel}
          </Text>
        ) : null}
      </YStack>
    );
  }

  if (expired) {
    return (
      <Text
        testID="ticket-reopen-expired"
        fontSize={11}
        color="$muted"
        textAlign="center"
        paddingHorizontal={16}
        paddingTop={8}
      >
        The re-open window has passed — start a new ticket if you still need help.
      </Text>
    );
  }

  return null;
}
