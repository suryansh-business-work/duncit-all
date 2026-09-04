import { useEffect, useRef, useState } from 'react';
import { Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SHEET_SAFE_AREA } from '@/components/DuncitDialog/sheet-body';
import { useCameraPermissions } from 'expo-camera';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { KeyboardScreen } from '@/components/KeyboardScreen';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import { HostScanPodTicketDocument } from '@/graphql/host-manage';
import { graphqlRequest } from '@/services/graphql.client';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { CompanionsChecklist } from './CompanionsChecklist';
import { CompanionsForm } from './CompanionsForm';
import { ScanConfirmation } from './ScanConfirmation';
import { ScannedAttendeeCard } from './ScannedAttendeeCard';
import { ScannerFrame } from './ScannerFrame';
import type { HostTicketScanResult, PodCompanionRecord } from './scan.types';
import type { CompanionRecordInput } from '@duncit/utils';
import { PRESS_STYLE } from '@duncit/buttons-native';

/**
 * How a result should read. A ticket that needs the rest of the group is the
 * next step, not a failure — mWeb applies the same rule.
 */
function resultTone(result: HostTicketScanResult): string {
  if (result.ok) return '$success';
  return result.requires_companions ? '$color' : '$danger';
}

/**
 * What the green-tick roster says under a companion's name.
 *
 * The number on file, plus whether that number actually answered a code — the
 * host verified them one at a time, and this is where they see which of them
 * it worked for.
 */
/**
 * The numbers this booking has already spoken for — twin of mWeb's
 * reservedPhones (rule 27).
 *
 * The buyer's own phone and WhatsApp, plus everyone already written onto the
 * ticket. A companion row may not repeat one: a single WhatsApp answering a
 * single code must never tick two seats.
 */
function reservedPhones(result: HostTicketScanResult | null): string[] {
  const attendee = result?.attendee;
  return [attendee?.phone ?? '', attendee?.whatsapp ?? ''].concat(
    (result?.companions ?? []).map((companion) => companion.phone_number),
  );
}

function companionLine(companion: PodCompanionRecord, verified: string): string {
  if (!companion.verified_at) return companion.phone_number;
  return `${companion.phone_number} · ${verified}`;
}

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
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [result, setResult] = useState<HostTicketScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // The scan that just FLIPPED the ticket — drives the confirmation overlay.
  // Kept separately from `result` so dismissing it leaves the pane's state.
  const [confirmed, setConfirmed] = useState<HostTicketScanResult | null>(null);
  // The token of the ticket on screen, so the second call — the one carrying
  // the group's details — scans the same ticket without another QR read.
  const [pendingToken, setPendingToken] = useState<string | null>(null);

  // Closing does not cancel an in-flight scan, and the dialog stays mounted —
  // without this, a late response repopulates the cleared state and the next
  // open greets the host with the previous pod's ghost confirmation.
  const epochRef = useRef(0);

  useEffect(() => {
    epochRef.current += 1;
    setResult(null);
    setError(null);
    setConfirmed(null);
    setPendingToken(null);
    if (pod && permission && !permission.granted) {
      requestPermission().catch(() => undefined);
    }
  }, [pod]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (token: string, companions?: CompanionRecordInput[]) => {
    const epoch = epochRef.current;
    setBusy(true);
    setError(null);
    try {
      const res = await graphqlRequest(
        HostScanPodTicketDocument,
        { pod_doc_id: pod?.id ?? '', token, companions: companions ?? null },
        { auth: true },
      );
      if (epoch !== epochRef.current) return;
      const outcome = res.hostScanPodTicket as HostTicketScanResult;
      setPendingToken(token);
      setResult(outcome);
      // Freshly marked (not a re-scan of someone already in) → confirm it
      // unmissably. A one-line text swap read as "nothing happened".
      if (outcome.ok && !outcome.already_checked_in) setConfirmed(outcome);
    } catch (err) {
      if (epoch !== epochRef.current) return;
      setError(err instanceof Error ? err.message : t('mweb.hostManage.couldNotReadThatTicket'));
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    epochRef.current += 1;
    setResult(null);
    setError(null);
    setConfirmed(null);
    setPendingToken(null);
    onClose();
  };

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
        <KeyboardScreen>
          <YStack flex={1} alignItems="center" justifyContent="center" testID="ticket-scan-dialog">
            <YStack
              pressStyle={PRESS_STYLE.surface}
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
              borderRadius={20}
              padding={18}
            >
              <SafeAreaView edges={[]} style={SHEET_SAFE_AREA}>
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

                    {/* "Add the other person" is an INSTRUCTION, not a failure —
                        colouring it red made a working scan look broken, and the
                        form below it was missed entirely. mWeb reads the same. */}
                    {result ? (
                      <Text
                        testID="ticket-scan-message"
                        fontSize={13.5}
                        fontWeight="700"
                        color={resultTone(result)}
                      >
                        {result.ok ? confirmation : result.message}
                      </Text>
                    ) : null}

                    {attendee ? (
                      <ScannedAttendeeCard
                        attendee={attendee}
                        alreadyCheckedIn={!!result?.already_checked_in}
                        pending={!!result?.requires_companions}
                        ticketCode={result?.ticket?.ticket_code}
                        seats={result?.ticket?.seats ?? 1}
                        onOpenProfile={() => onOpenProfile(attendee.user_id)}
                      />
                    ) : null}

                    {recorded.length > 0 ? (
                      <CompanionsChecklist
                        title={t('mweb.hostScan.checkedInList')}
                        people={recorded.map((companion) => ({
                          key: `${companion.phone_number}-${companion.name}`,
                          primary: companion.name,
                          secondary: companionLine(companion, t('mweb.hostScan.companionVerified')),
                        }))}
                      />
                    ) : null}

                    {result?.requires_companions && pendingToken && result.ticket ? (
                      <CompanionsForm
                        /* Keyed on the booking: the form sizes its rows from
                           companions_required once, at mount. A different
                           ticket must therefore get a different form, while a
                           re-scan of the SAME one keeps what the host typed. */
                        key={result.ticket.membership_id}
                        podId={pod?.id ?? ''}
                        membershipId={result.ticket.membership_id}
                        seats={result.ticket.seats ?? 1}
                        required={result.companions_required}
                        reserved={reservedPhones(result)}
                        busy={busy}
                        onSubmit={(companions) => void submit(pendingToken, companions)}
                      />
                    ) : null}
                  </YStack>
                </ScrollView>

                <XStack gap={12} paddingTop={12}>
                  <XStack
                    testID="ticket-scan-close"
                    role="button"
                    aria-label={t('mweb.common.close')}
                    onPress={close}
                    flex={1}
                    height={46}
                    alignItems="center"
                    justifyContent="center"
                    borderRadius={12}
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
                      role="button"
                      aria-label={t('mweb.hostManage.scanNext')}
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
                      pressStyle={PRESS_STYLE.control}
                    >
                      <Text fontSize={14} fontWeight="700" color={onPrimary}>
                        Scan next
                      </Text>
                    </XStack>
                  ) : null}
                </XStack>
              </SafeAreaView>
            </YStack>
            <ScanConfirmation
              result={confirmed}
              text={confirmation}
              onDone={() => setConfirmed(null)}
            />
          </YStack>
        </KeyboardScreen>
      </ModalThemeScope>
    </Modal>
  );
}
