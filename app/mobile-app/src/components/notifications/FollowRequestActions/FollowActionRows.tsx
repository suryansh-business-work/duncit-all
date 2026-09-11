import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

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
 * CREATES the follow edge. Accept is the filled pill, Deny the soft one.
 * mWeb twin (rule 27).
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
      <XStack
        testID="follow-request-accept"
        role="button"
        aria-label={acceptLabel}
        onPress={onAccept}
        height={32}
        paddingHorizontal={14}
        alignItems="center"
        borderRadius={999}
        backgroundColor={accentInk}
        pressStyle={PRESS_STYLE.solid}
      >
        <Text fontSize={13} fontWeight="600" color="$onPrimary">
          {acceptLabel}
        </Text>
      </XStack>
      <XStack
        testID="follow-request-reject"
        role="button"
        aria-label={denyLabel}
        onPress={onDeny}
        height={32}
        paddingHorizontal={14}
        alignItems="center"
        borderRadius={999}
        backgroundColor="$soft"
        opacity={dimQuiet ? 0.75 : 1}
        pressStyle={PRESS_STYLE.control}
      >
        <Text fontSize={13} fontWeight="600" color={quietInk}>
          {denyLabel}
        </Text>
      </XStack>
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
      height={32}
      paddingHorizontal={14}
      alignItems="center"
      borderRadius={999}
      backgroundColor="$soft"
      opacity={pending ? 0.6 : 1}
      onPress={onPress}
      pressStyle={PRESS_STYLE.control}
    >
      <MaterialIcons name="person-add-alt-1" size={15} color={accentInk} />
      <Text fontSize={13} fontWeight="600" color={accentInk}>
        {label}
      </Text>
    </XStack>
  );
}
