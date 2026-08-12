import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, YStack } from 'tamagui';

import { ActionRow } from '@/components/host-manage/ActionRow';
import { FeedbackLinkRow } from '@/components/host-manage/FeedbackLinkRow';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  open: boolean;
  podTitle: string;
  onClose: () => void;
  onScan: () => void;
  onComplete: () => void;
  onEdit: () => void;
  onOpenFeedback: () => void;
  onShareFeedback: () => void;
  onCopyFeedback: () => void;
  onCancel: () => void;
  onClubAdmin: () => void;
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
  onOpenFeedback,
  onShareFeedback,
  onCopyFeedback,
  onCancel,
  onClubAdmin,
}: Readonly<Props>) {
  const { t } = useTranslation();
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
                {/* The rating link: tapping the row opens the form, and the two
                    icons beside it hand the link to the people who came. */}
                <FeedbackLinkRow
                  onOpen={onOpenFeedback}
                  onShare={onShareFeedback}
                  onCopy={onCopyFeedback}
                />
                <ActionRow
                  testID="pod-action-club-admin"
                  icon="support-agent"
                  label={t('mweb.podClubAdmin.menuItem')}
                  tint={primary}
                  onPress={onClubAdmin}
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
