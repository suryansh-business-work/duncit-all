import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';
import { PRESS_STYLE, withAlpha } from '@duncit/buttons-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import type { VenueApprovalChip } from '@/utils/venue-approval';

/** Tint of a warning note — the same 14% mWeb's standard warning Alert draws. */
const NOTE_ALPHA = 0.14;

/** The Paid / Free pill on the right of a hosted-pod row — outlined in the
 * tone mWeb's outlined Chip uses (success for free, primary for paid). */
export function TypePill({ label, free }: Readonly<{ label: string; free: boolean }>) {
  const tone = free ? '$success' : '$primary';
  return (
    <XStack
      height={24}
      paddingHorizontal={10}
      alignItems="center"
      borderRadius={999}
      borderWidth={1}
      borderColor={tone}
    >
      <Text fontSize={12} fontWeight="600" color={tone} numberOfLines={1}>
        {label}
      </Text>
    </XStack>
  );
}

/** The venue-approval status chip — a filled pill, like mWeb's status Chip. */
export function ApprovalPill({
  approval,
  testID,
}: Readonly<{ approval: VenueApprovalChip; testID: string }>) {
  const tone = approval.tone === 'error' ? '$danger' : '$warning';
  return (
    <XStack
      alignSelf="flex-start"
      height={24}
      paddingHorizontal={10}
      alignItems="center"
      borderRadius={999}
      backgroundColor={tone}
    >
      <Text testID={testID} fontSize={12} fontWeight="600" color="$onPrimary" numberOfLines={1}>
        {approval.label}
      </Text>
    </XStack>
  );
}

/** The resubmission note under a venue-rejected pod — mWeb's warning Alert. */
export function WarningNote({ text, testID }: Readonly<{ text: string; testID: string }>) {
  const { warning } = useThemeColors();
  return (
    <XStack
      testID={testID}
      alignItems="flex-start"
      gap={8}
      padding={12}
      borderRadius={14}
      backgroundColor={withAlpha(warning, NOTE_ALPHA)}
    >
      <MaterialIcons name="info-outline" size={16} color={warning} />
      <Text flex={1} fontSize={12.5} color="$color">
        {text}
      </Text>
    </XStack>
  );
}

/** The one line an empty (or filtered-empty) list group says, centred in its card. */
export function EmptyLine({ text, testID }: Readonly<{ text: string; testID: string }>) {
  return (
    <Text
      testID={testID}
      paddingHorizontal={16}
      paddingVertical={20}
      fontSize={14}
      color="$muted"
      textAlign="center"
    >
      {text}
    </Text>
  );
}

/** The ⋮ button that opens a pod's actions sheet — a bare 40px circle. */
export function OverflowButton({
  testID,
  label,
  onPress,
}: Readonly<{ testID: string; label: string; onPress: () => void }>) {
  const { color: ink } = useThemeColors();
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      onPress={onPress}
      width={40}
      height={40}
      alignItems="center"
      justifyContent="center"
      borderRadius={20}
      pressStyle={PRESS_STYLE.inline}
    >
      <MaterialIcons name="more-vert" size={20} color={ink} />
    </XStack>
  );
}
