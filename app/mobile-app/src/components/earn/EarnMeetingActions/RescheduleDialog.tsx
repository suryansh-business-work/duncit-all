import { Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { KeyboardScreen } from '@/components/KeyboardScreen';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import { SlotPicker } from '@/components/survey-onboarding/SlotPicker';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { MeetingSlot } from '@/graphql/onboarding-survey';
import { ReasonField } from './ReasonField';

interface Props {
  open: boolean;
  slots: MeetingSlot[];
  slotsLoading: boolean;
  slot: string;
  onPickSlot: (v: string) => void;
  /** The meeting's current slot — shown for reference (highlighted, not re-pickable). */
  currentSlot?: string | null;
  reason: string;
  onChangeReason: (v: string) => void;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

const formatSlot = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/** Slot grid + required reason for a one-time meeting reschedule. */
export function RescheduleDialog({
  open,
  slots,
  slotsLoading,
  slot,
  onPickSlot,
  currentSlot,
  reason,
  onChangeReason,
  busy,
  error,
  onClose,
  onConfirm,
}: Readonly<Props>) {
  const { primary, onPrimary } = useThemeColors();
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <ModalThemeScope>
        <KeyboardScreen>
          <YStack flex={1} alignItems="center" justifyContent="center" testID="reschedule-dialog">
            <YStack
              testID="reschedule-backdrop"
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
                <ScrollView keyboardShouldPersistTaps="handled">
                  {currentSlot ? (
                    <Text
                      testID="reschedule-current"
                      fontSize={12.5}
                      color="$muted"
                      paddingBottom={10}
                    >
                      Currently booked for {formatSlot(currentSlot)}. Pick a different open slot
                      below.
                    </Text>
                  ) : null}
                  {slotsLoading ? <Spinner testID="reschedule-loading" color={primary} /> : null}
                  {!slotsLoading && slots.length === 0 ? (
                    <Text testID="reschedule-empty" fontSize={13} color="$muted">
                      No slots are open right now — please check back soon.
                    </Text>
                  ) : null}
                  {slots.length > 0 ? (
                    <SlotPicker
                      slots={slots}
                      value={slot}
                      onChange={onPickSlot}
                      currentSlot={currentSlot ?? undefined}
                    />
                  ) : null}
                  <ReasonField
                    testID="reschedule-reason"
                    label="Why are you rescheduling?"
                    value={reason}
                    onChangeText={onChangeReason}
                  />
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
                    onPress={onClose}
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
                    onPress={busy ? undefined : onConfirm}
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
        </KeyboardScreen>
      </ModalThemeScope>
    </Modal>
  );
}
