import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

interface AnswerActionsProps {
  acceptLabel: string;
  denyLabel: string;
  /** Both inks are decided by the parent — see the note where they are built. */
  accentInk: string;
  quietInk: string;
  /** An unread row is painted with the primary gradient, so Deny is dimmed
   * rather than recoloured — a palette grey disappears on it. */
  dimQuiet: boolean;
  onAccept: () => void;
  onDeny: () => void;
}

/**
 * Accept / Deny — the private profile's whole gate, since accepting is what
 * CREATES the follow edge. Text buttons, not filled ones: the row is already a
 * large tappable card, so a solid button fights it. mWeb twin (rule 27).
 */
export function AnswerActions({
  acceptLabel,
  denyLabel,
  accentInk,
  quietInk,
  dimQuiet,
  onAccept,
  onDeny,
}: Readonly<AnswerActionsProps>) {
  return (
    <>
      <Text
        testID="follow-request-accept"
        role="button"
        aria-label={acceptLabel}
        onPress={onAccept}
        fontSize={13.5}
        fontWeight="800"
        color={accentInk}
        pressStyle={{ opacity: 0.6 }}
      >
        {acceptLabel}
      </Text>
      <Text
        testID="follow-request-reject"
        role="button"
        aria-label={denyLabel}
        onPress={onDeny}
        fontSize={13.5}
        fontWeight="800"
        color={quietInk}
        opacity={dimQuiet ? 0.75 : 1}
        pressStyle={{ opacity: 0.6 }}
      >
        {denyLabel}
      </Text>
    </>
  );
}

interface FollowBackActionProps {
  /** Follow Back, or the flat "Requested" when the ask is already open. */
  label: string;
  pending: boolean;
  accentInk: string;
  /** Absent when there is nothing left to send, which is what greys the row. */
  onPress?: () => void;
}

/**
 * Follow Back. It carries the person-add icon so it reads as a different kind
 * of action from Accept / Deny when all three sit on the same row.
 */
export function FollowBackAction({
  label,
  pending,
  accentInk,
  onPress,
}: Readonly<FollowBackActionProps>) {
  return (
    <XStack
      testID="follow-request-follow-back"
      role="button"
      aria-label={label}
      gap={5}
      alignItems="center"
      opacity={pending ? 0.6 : 1}
      onPress={onPress}
      pressStyle={{ opacity: 0.6 }}
    >
      <MaterialIcons name="person-add-alt-1" size={15} color={accentInk} />
      <Text fontSize={13.5} fontWeight="800" color={accentInk}>
        {label}
      </Text>
    </XStack>
  );
}
