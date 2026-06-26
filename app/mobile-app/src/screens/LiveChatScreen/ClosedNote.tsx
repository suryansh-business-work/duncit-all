import { Text, YStack } from 'tamagui';

const RESOLVED_NOTE = 'This conversation has been marked as resolved.';
const EXPIRED_NOTE =
  'This chat is resolved. The re-open window has passed — start a new chat if you still need help.';

interface Props {
  reopenAllowed: boolean;
  deadlineLabel: string;
}

/**
 * The note shown under a resolved chat (B7) — the composer is locked, so the
 * copy no longer invites sending; it can still be re-opened within the window.
 */
export function ClosedNote({ reopenAllowed, deadlineLabel }: Readonly<Props>) {
  return (
    <YStack alignItems="center" padding={6} gap={2}>
      <Text testID="chat-closed-note" fontSize={12} color="$muted" textAlign="center">
        {reopenAllowed ? RESOLVED_NOTE : EXPIRED_NOTE}
      </Text>
      {reopenAllowed && deadlineLabel ? (
        <Text testID="chat-reopen-deadline" fontSize={11} color="$muted" textAlign="center">
          You can reopen until {deadlineLabel}
        </Text>
      ) : null}
    </YStack>
  );
}
