import { Modal, ScrollView } from 'react-native';
import { ModalSafeArea } from '@/components/ModalSafeArea';
import { SHEET_SAFE_AREA } from '@/components/DuncitDialog/sheet-body';
import { Text, XStack, YStack } from 'tamagui';

import { KeyboardScreen } from '@/components/KeyboardScreen';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ScanConfirmation } from '../ScanConfirmation';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { TicketScanBody } from './TicketScanBody';
import type { ScanTarget } from './types';
import { useTicketScan } from './useTicketScan';

interface Props {
  pod: ScanTarget | null;
  onClose: () => void;
  onOpenProfile: (userId: string) => void;
}

/** Camera check-in for one pod: scan a ticket QR, mark the attendee present and
 * show who they are. Twin of mWeb's TicketScanDialog (rule 27). */
export function TicketScanDialog({ pod, onClose, onOpenProfile }: Readonly<Props>) {
  const { onPrimary } = useThemeColors();
  const scan = useTicketScan(pod, onClose);
  const { t, result, close } = scan;

  const attendee = result?.attendee ?? null;
  // Everyone this booking has accounted for — companions are on file even in
  // the collecting state (a partially-recorded group renders its ticks).
  const recorded = result?.companions ?? [];

  // What a successful scan actually says. The server's `message` is written for
  // the failure cases; on success it left the host reading the same neutral line
  // whether one person or a group of four had just been checked in.
  const seats = result?.ticket?.seats ?? 1;
  const who = attendee?.full_name ?? '';
  let confirmation = t('mweb.hostScan.attendanceMarked');
  if (result?.already_checked_in) {
    confirmation = t('mweb.hostScan.alreadyMarked');
  } else if (seats > 1) {
    confirmation = t('mweb.hostScan.attendanceMarkedGroup', {
      vars: { name: who, count: seats - 1 },
    });
  } else if (who) {
    confirmation = t('mweb.hostScan.attendanceMarkedOne', { vars: { name: who } });
  }

  return (
    <Modal visible={!!pod} transparent animationType="fade" onRequestClose={close}>
      <ModalThemeScope>
        <KeyboardScreen flush>
          <YStack
            flex={1}
            alignItems="center"
            justifyContent="center"
            testID="ticket-scan-dialog"
            onAccessibilityEscape={close}
          >
            <YStack
              pressStyle={PRESS_STYLE.surface}
              importantForAccessibility="no"
              role="button"
              aria-label={t('mweb.common.close')}
              onPress={close}
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              backgroundColor="rgba(0,0,0,0.6)"
            />
            <YStack
              width="92%"
              maxWidth={460}
              maxHeight="88%"
              backgroundColor="$background"
              borderRadius={28}
              padding={18}
            >
              <ModalSafeArea edges={[]} style={SHEET_SAFE_AREA}>
                <Text
                  testID="ticket-scan-title"
                  role="heading"
                  fontSize={17}
                  fontWeight="600"
                  color="$color"
                >
                  Scan attendee tickets
                </Text>
                <Text
                  fontSize={12.5}
                  color="$muted"
                  paddingTop={2}
                  paddingBottom={10}
                  numberOfLines={1}
                >
                  {pod?.pod_title}
                </Text>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <YStack gap={12} paddingBottom={6}>
                    <TicketScanBody
                      pod={pod}
                      scan={scan}
                      attendee={attendee}
                      recorded={recorded}
                      confirmation={confirmation}
                      onOpenProfile={onOpenProfile}
                    />
                  </YStack>
                </ScrollView>

                <XStack gap={12} paddingTop={12}>
                  <XStack
                    testID="ticket-scan-close"
                    tabIndex={0}
                    role="button"
                    aria-label={t('mweb.common.close')}
                    onPress={close}
                    flex={1}
                    height={48}
                    alignItems="center"
                    justifyContent="center"
                    borderRadius={999}
                    borderWidth={1}
                    borderColor="$borderColor"
                    pressStyle={PRESS_STYLE.control}
                  >
                    <Text fontSize={14} fontWeight="600" color="$color">
                      Close
                    </Text>
                  </XStack>
                  {result ? (
                    <XStack
                      testID="ticket-scan-next"
                      tabIndex={0}
                      role="button"
                      aria-label={t('mweb.hostManage.scanNext')}
                      onPress={scan.scanNext}
                      flex={1}
                      height={48}
                      alignItems="center"
                      justifyContent="center"
                      borderRadius={999}
                      backgroundColor="$primary"
                      pressStyle={PRESS_STYLE.solid}
                    >
                      <Text fontSize={14} fontWeight="600" color={onPrimary}>
                        Scan next
                      </Text>
                    </XStack>
                  ) : null}
                </XStack>
              </ModalSafeArea>
            </YStack>
            <ScanConfirmation
              result={scan.confirmed}
              text={confirmation}
              onDone={() => scan.setConfirmed(null)}
            />
          </YStack>
        </KeyboardScreen>
      </ModalThemeScope>
    </Modal>
  );
}
