import { useState } from 'react';
import { Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { SlotPicker } from '@/components/survey-onboarding/SlotPicker';
import { useThemeColors } from '@/hooks/useThemeColors';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';
import {
  CancelMyMeetingDocument,
  MeetingSlotsDocument,
  RescheduleMyMeetingDocument,
  type MeetingSlot,
  type MeetingSlotsResult,
} from '@/graphql/onboarding-survey';

interface Props {
  kind: string;
  /** Called after a successful reschedule/cancel so the screen can refetch. */
  onChanged: () => void;
}

interface ActionButtonProps {
  label: string;
  danger?: boolean;
  testID: string;
  onPress: () => void;
}

function ActionButton({ label, danger = false, testID, onPress }: Readonly<ActionButtonProps>) {
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      onPress={onPress}
      paddingHorizontal={14}
      paddingVertical={9}
      borderRadius={999}
      borderWidth={1}
      borderColor={danger ? '$danger' : '$primary'}
      pressStyle={{ opacity: 0.7 }}
    >
      <Text fontSize={12.5} fontWeight="800" color={danger ? '$danger' : '$primary'}>
        {label}
      </Text>
    </XStack>
  );
}

/** Reschedule / cancel actions for an Earn card with a pending onboarding
 * meeting — the Tamagui twin of mWeb's EarnMeetingActions. */
export function EarnMeetingActions({ kind, onChanged }: Readonly<Props>) {
  const { primary, onPrimary } = useThemeColors();
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [slots, setSlots] = useState<MeetingSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slot, setSlot] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeReschedule = () => setRescheduleOpen(false);
  const closeCancel = () => setCancelOpen(false);

  const openReschedule = () => {
    setError(null);
    setSlot('');
    setRescheduleOpen(true);
    setSlotsLoading(true);
    graphqlRequest<MeetingSlotsResult>(MeetingSlotsDocument, undefined, { auth: true })
      .then((res) => setSlots(res.meetingSlots))
      .catch((e) => setError(toErrorMessage(e, 'Could not load the available slots')))
      .finally(() => setSlotsLoading(false));
  };

  const reschedule = async () => {
    if (!slot) {
      setError('Pick an available slot');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await graphqlRequest(
        RescheduleMyMeetingDocument,
        { kind, requested_at: slot },
        { auth: true },
      );
      setRescheduleOpen(false);
      onChanged();
    } catch (e) {
      setError(toErrorMessage(e, 'Could not reschedule — please try again'));
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    try {
      await graphqlRequest(CancelMyMeetingDocument, { kind }, { auth: true });
      setCancelOpen(false);
      onChanged();
    } catch {
      setCancelOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <XStack gap={8} paddingTop={2}>
      <ActionButton
        testID={`reschedule-${kind}`}
        label="Reschedule meeting"
        onPress={openReschedule}
      />
      <ActionButton
        testID={`cancel-${kind}`}
        label="Cancel meeting"
        danger
        onPress={() => setCancelOpen(true)}
      />

      <Modal
        visible={rescheduleOpen}
        transparent
        animationType="fade"
        onRequestClose={closeReschedule}
      >
        <ModalThemeScope>
          <YStack flex={1} alignItems="center" justifyContent="center" testID="reschedule-dialog">
            <YStack
              testID="reschedule-backdrop"
              role="button"
              aria-label="Close"
              onPress={closeReschedule}
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              backgroundColor="rgba(0,0,0,0.5)"
            />
            <YStack
              width="92%"
              maxWidth={460}
              maxHeight="80%"
              backgroundColor="$background"
              borderRadius={20}
              padding={16}
              gap={10}
            >
              <SafeAreaView edges={[]}>
                <Text fontSize={17} fontWeight="900" color="$color" paddingBottom={8}>
                  Reschedule your onboarding meeting
                </Text>
                <ScrollView>
                  {slotsLoading ? <Spinner testID="reschedule-loading" color={primary} /> : null}
                  {!slotsLoading && slots.length === 0 ? (
                    <Text testID="reschedule-empty" fontSize={13} color="$muted">
                      No slots are open right now — please check back soon.
                    </Text>
                  ) : null}
                  {slots.length > 0 ? (
                    <SlotPicker slots={slots} value={slot} onChange={setSlot} />
                  ) : null}
                  {error ? (
                    <Text testID="reschedule-error" fontSize={12.5} color="$danger" paddingTop={8}>
                      {error}
                    </Text>
                  ) : null}
                </ScrollView>
                <XStack gap={10} paddingTop={12}>
                  <XStack
                    testID="reschedule-close"
                    role="button"
                    aria-label="Close"
                    onPress={closeReschedule}
                    flex={1}
                    height={44}
                    alignItems="center"
                    justifyContent="center"
                    borderRadius={12}
                    borderWidth={1}
                    borderColor="$borderColor"
                    pressStyle={{ opacity: 0.85 }}
                  >
                    <Text fontSize={14} fontWeight="800" color="$color">
                      Close
                    </Text>
                  </XStack>
                  <XStack
                    testID="reschedule-confirm"
                    role="button"
                    aria-label="Move to this slot"
                    aria-disabled={busy}
                    onPress={busy ? undefined : () => void reschedule()}
                    flex={1}
                    height={44}
                    alignItems="center"
                    justifyContent="center"
                    borderRadius={12}
                    backgroundColor="$primary"
                    opacity={busy ? 0.7 : 1}
                    pressStyle={{ opacity: 0.85 }}
                  >
                    <Text fontSize={14} fontWeight="900" color={onPrimary}>
                      {busy ? 'Moving…' : 'Move to this slot'}
                    </Text>
                  </XStack>
                </XStack>
              </SafeAreaView>
            </YStack>
          </YStack>
        </ModalThemeScope>
      </Modal>

      <Modal visible={cancelOpen} transparent animationType="fade" onRequestClose={closeCancel}>
        <ModalThemeScope>
          <YStack flex={1} alignItems="center" justifyContent="center" testID="cancel-dialog">
            <YStack
              testID="cancel-backdrop"
              role="button"
              aria-label="Close"
              onPress={closeCancel}
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              backgroundColor="rgba(0,0,0,0.5)"
            />
            <YStack
              width="86%"
              maxWidth={420}
              backgroundColor="$background"
              borderRadius={20}
              padding={20}
              gap={10}
            >
              <SafeAreaView edges={[]}>
                <Text fontSize={17} fontWeight="900" color="$color">
                  Cancel this meeting?
                </Text>
                <Text fontSize={13.5} color="$muted" paddingTop={6}>
                  Your onboarding meeting will be cancelled and the slot freed. You can book a new
                  one anytime.
                </Text>
                <XStack gap={12} paddingTop={16}>
                  <XStack
                    testID="cancel-keep"
                    role="button"
                    aria-label="Keep meeting"
                    onPress={closeCancel}
                    flex={1}
                    height={46}
                    alignItems="center"
                    justifyContent="center"
                    borderRadius={12}
                    borderWidth={1}
                    borderColor="$borderColor"
                    pressStyle={{ opacity: 0.85 }}
                  >
                    <Text fontSize={14} fontWeight="800" color="$color">
                      Keep meeting
                    </Text>
                  </XStack>
                  <XStack
                    testID="cancel-confirm"
                    role="button"
                    aria-label="Cancel meeting"
                    aria-disabled={busy}
                    onPress={busy ? undefined : () => void cancel()}
                    flex={1}
                    height={46}
                    alignItems="center"
                    justifyContent="center"
                    borderRadius={12}
                    backgroundColor="$danger"
                    opacity={busy ? 0.7 : 1}
                    pressStyle={{ opacity: 0.85 }}
                  >
                    <Text fontSize={14} fontWeight="900" color={onPrimary}>
                      {busy ? 'Cancelling…' : 'Cancel meeting'}
                    </Text>
                  </XStack>
                </XStack>
              </SafeAreaView>
            </YStack>
          </YStack>
        </ModalThemeScope>
      </Modal>
    </XStack>
  );
}
