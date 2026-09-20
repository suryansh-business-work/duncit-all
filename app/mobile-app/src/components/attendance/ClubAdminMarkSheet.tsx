import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import type { PodAttendanceLabels, PodAttendanceRow } from '@duncit/utils';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { DuncitDialog } from '@/components/DuncitDialog';
import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  row: PodAttendanceRow | null;
  labels: PodAttendanceLabels;
  onClose: () => void;
  onChooseOtp: () => void;
  onChooseDirect: () => void;
}

/** One of the two doors, as a control big enough to read the reason on. */
function DoorOption({
  icon,
  title,
  body,
  testID,
  onPress,
}: Readonly<{
  icon: 'sms' | 'edit-note';
  title: string;
  body: string;
  testID: string;
  onPress: () => void;
}>) {
  const { muted, color: ink } = useThemeColors();
  return (
    <XStack
      testID={testID}
      role="button"
      tabIndex={0}
      aria-label={title}
      accessibilityHint={body}
      onPress={onPress}
      gap={12}
      padding={14}
      borderRadius={16}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      alignItems="center"
      pressStyle={PRESS_STYLE.control}
    >
      <MaterialIcons name={icon} size={20} color={ink} />
      <YStack flex={1} gap={2}>
        <Text fontSize={14.5} fontWeight="600" color="$color">
          {title}
        </Text>
        <Text fontSize={12.5} color="$muted">
          {body}
        </Text>
      </YStack>
      <MaterialIcons name="chevron-right" size={20} color={muted} />
    </XStack>
  );
}

/**
 * Which door a Club Admin is marking through — the Tamagui twin of the shared
 * MUI `ClubAdminMarkDialog` (rule 27).
 *
 * They get two different calls, and the app used to answer neither: pressing
 * Mark called the HOST's mutation, which the server refuses for anyone who is
 * not the pod's host. "I could not scan them" wants a one-time code sent to the
 * attendee. "The host forgot the whole pod and read me the names" wants no code
 * at all, because ringing every attendee for one is exactly the work that call
 * is delegating.
 *
 * Asked FIRST, before either sheet's own form, so the admin is never halfway
 * through sending a code they did not want to send.
 */
export function ClubAdminMarkSheet({
  row,
  labels,
  onClose,
  onChooseOtp,
  onChooseDirect,
}: Readonly<Props>) {
  return (
    <DuncitDialog
      open={!!row}
      onClose={onClose}
      testID="attendance-choose-dialog"
      title={labels.chooseTitle(row?.name ?? '')}
      closeLabel={labels.chooseCancel}
    >
      <YStack gap={12}>
        <Text fontSize={13} color="$muted">
          {labels.chooseBody}
        </Text>
        <DoorOption
          icon="sms"
          title={labels.chooseOtpTitle}
          body={labels.chooseOtpBody}
          testID="attendance-choose-otp"
          onPress={onChooseOtp}
        />
        <DoorOption
          icon="edit-note"
          title={labels.chooseDirectTitle}
          body={labels.chooseDirectBody}
          testID="attendance-choose-direct"
          onPress={onChooseDirect}
        />
      </YStack>
    </DuncitDialog>
  );
}
