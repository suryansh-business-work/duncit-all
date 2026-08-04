import { useEffect, useState } from 'react';
import { Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCameraPermissions } from 'expo-camera';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { HostScanPodTicketDocument } from '@/graphql/host-manage';
import { graphqlRequest } from '@/services/graphql.client';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ScannedAttendeeCard } from './ScannedAttendeeCard';
import { ScannerFrame } from './ScannerFrame';
import type { HostTicketScanResult } from './scan.types';

export interface ScanTarget {
  id: string;
  pod_title: string;
}

interface Props {
  pod: ScanTarget | null;
  onClose: () => void;
  onOpenProfile: (userId: string) => void;
}

/** Camera check-in for one pod: scan a ticket QR, mark the attendee present and
 * show who they are. Twin of mWeb's TicketScanDialog (rule 27). */
export function TicketScanDialog({ pod, onClose, onOpenProfile }: Readonly<Props>) {
  const { onPrimary } = useThemeColors();
  const [permission, requestPermission] = useCameraPermissions();
  const [result, setResult] = useState<HostTicketScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setResult(null);
    setError(null);
    if (pod && permission && !permission.granted) {
      requestPermission().catch(() => undefined);
    }
  }, [pod]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (token: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await graphqlRequest(
        HostScanPodTicketDocument,
        { pod_doc_id: pod?.id ?? '', token },
        { auth: true },
      );
      setResult(res.hostScanPodTicket as HostTicketScanResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that ticket');
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    setResult(null);
    setError(null);
    onClose();
  };

  const attendee = result?.attendee ?? null;

  return (
    <Modal visible={!!pod} transparent animationType="fade" onRequestClose={close}>
      <ModalThemeScope>
        <YStack flex={1} alignItems="center" justifyContent="center" testID="ticket-scan-dialog">
          <YStack
            role="button"
            aria-label="Close"
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
            borderRadius={20}
            padding={18}
          >
            <SafeAreaView edges={[]}>
              <Text fontSize={17} fontWeight="700" color="$color">
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
                  {busy ? <Spinner testID="ticket-scan-busy" color="$primary" /> : null}

                  {!result && !busy ? (
                    <ScannerFrame
                      granted={!!permission?.granted}
                      scanning={!!pod}
                      onCode={(token) => void submit(token)}
                    />
                  ) : null}

                  {error ? (
                    <Text testID="ticket-scan-error" fontSize={13} color="$danger">
                      {error}
                    </Text>
                  ) : null}

                  {result ? (
                    <Text
                      testID="ticket-scan-message"
                      fontSize={13.5}
                      fontWeight="700"
                      color={result.ok ? '$success' : '$danger'}
                    >
                      {result.message}
                    </Text>
                  ) : null}

                  {attendee ? (
                    <ScannedAttendeeCard
                      attendee={attendee}
                      alreadyCheckedIn={!!result?.already_checked_in}
                      ticketCode={result?.ticket?.ticket_code}
                      onOpenProfile={() => onOpenProfile(attendee.user_id)}
                    />
                  ) : null}
                </YStack>
              </ScrollView>

              <XStack gap={12} paddingTop={12}>
                <XStack
                  testID="ticket-scan-close"
                  role="button"
                  aria-label="Close"
                  onPress={close}
                  flex={1}
                  height={46}
                  alignItems="center"
                  justifyContent="center"
                  borderRadius={12}
                  borderWidth={1}
                  borderColor="$borderColor"
                  pressStyle={{ opacity: 0.85 }}
                >
                  <Text fontSize={14} fontWeight="600" color="$color">
                    Close
                  </Text>
                </XStack>
                {result ? (
                  <XStack
                    testID="ticket-scan-next"
                    role="button"
                    aria-label="Scan next"
                    onPress={() => {
                      setResult(null);
                      setError(null);
                    }}
                    flex={1}
                    height={46}
                    alignItems="center"
                    justifyContent="center"
                    borderRadius={12}
                    backgroundColor="$primary"
                    pressStyle={{ opacity: 0.85 }}
                  >
                    <Text fontSize={14} fontWeight="700" color={onPrimary}>
                      Scan next
                    </Text>
                  </XStack>
                ) : null}
              </XStack>
            </SafeAreaView>
          </YStack>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
