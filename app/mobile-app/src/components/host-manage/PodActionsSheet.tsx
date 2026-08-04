import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useThemeColors } from '@/hooks/useThemeColors';

type IconName = keyof typeof MaterialIcons.glyphMap;

interface ActionRowProps {
  testID: string;
  icon: IconName;
  label: string;
  tint: string;
  danger?: boolean;
  onPress: () => void;
}

/** One tappable action line inside the sheet. */
function ActionRow({ testID, icon, label, tint, danger, onPress }: Readonly<ActionRowProps>) {
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      onPress={onPress}
      alignItems="center"
      gap={12}
      height={52}
      paddingHorizontal={14}
      borderRadius={12}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      pressStyle={{ opacity: 0.85 }}
    >
      <MaterialIcons name={icon} size={20} color={tint} />
      <Text fontSize={14.5} fontWeight="600" color={danger ? '$danger' : '$color'}>
        {label}
      </Text>
    </XStack>
  );
}

interface Props {
  open: boolean;
  podTitle: string;
  onClose: () => void;
  onScan: () => void;
  onComplete: () => void;
  onEdit: () => void;
  onCancel: () => void;
}

/** Every per-pod action in one sheet, opened from the row's overflow button —
 * the Tamagui twin of mWeb's HostPodActionsMenu (rule 27). */
export function PodActionsSheet({
  open,
  podTitle,
  onClose,
  onScan,
  onComplete,
  onEdit,
  onCancel,
}: Readonly<Props>) {
  const { color: ink, danger, primary, success } = useThemeColors();

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <ModalThemeScope>
        <YStack flex={1} justifyContent="flex-end" testID="pod-actions-sheet">
          <YStack
            role="button"
            aria-label="Close"
            onPress={onClose}
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            backgroundColor="rgba(0,0,0,0.5)"
          />
          <YStack
            backgroundColor="$background"
            borderTopLeftRadius={20}
            borderTopRightRadius={20}
            padding={18}
          >
            <SafeAreaView edges={['bottom']}>
              <Text fontSize={16} fontWeight="700" color="$color" numberOfLines={1}>
                {podTitle}
              </Text>
              <Text fontSize={12.5} color="$muted" paddingTop={2} paddingBottom={12}>
                Pod actions
              </Text>
              <YStack gap={10}>
                <ActionRow
                  testID="pod-action-scan"
                  icon="qr-code-scanner"
                  label="Scan attendee event tickets"
                  tint={primary}
                  onPress={onScan}
                />
                <ActionRow
                  testID="pod-action-complete"
                  icon="task-alt"
                  label="Complete pod"
                  tint={success}
                  onPress={onComplete}
                />
                <ActionRow
                  testID="pod-action-edit"
                  icon="edit"
                  label="Edit pod"
                  tint={ink}
                  onPress={onEdit}
                />
                <ActionRow
                  testID="pod-action-cancel"
                  icon="cancel"
                  label="Cancel pod"
                  tint={danger}
                  danger
                  onPress={onCancel}
                />
              </YStack>
            </SafeAreaView>
          </YStack>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
