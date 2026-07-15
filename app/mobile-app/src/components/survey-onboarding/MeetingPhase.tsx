import { ScrollView } from 'react-native';
import { Button, Input, Spinner, Text, TextArea, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import type { ActiveSurvey, MeetingSlot } from '@/graphql/onboarding-survey';
import { SlotPicker } from './SlotPicker';
import type { Answer } from './useOnboardingFlow';

interface Props {
  survey: ActiveSurvey | null;
  answer: { get: (qid: string) => Answer };
  slots: MeetingSlot[];
  slotsLoading: boolean;
  selectedSlot: string;
  setSelectedSlot: (v: string) => void;
  name: string;
  setName: (v: string) => void;
  lockName: boolean;
  ext: string;
  phone: string;
  notes: string;
  setNotes: (v: string) => void;
  busy: boolean;
  error: string | null;
  onSubmit: () => void;
}

/** Slot booking — shown after the survey; recaps the submitted answers on top.
 * Booked slots come back disabled; phone is required. */
export function MeetingPhase({
  survey,
  answer,
  slots,
  slotsLoading,
  selectedSlot,
  setSelectedSlot,
  name,
  setName,
  lockName,
  ext,
  phone,
  notes,
  setNotes,
  busy,
  error,
  onSubmit,
}: Readonly<Props>) {
  const { color: ink, primary } = useThemeColors();
  const answered = (survey?.questions ?? [])
    .filter((q) => q.type !== 'SECTION')
    .map((q) => {
      const a = answer.get(q.qid);
      const text = a.values.length ? a.values.join(', ') : a.value;
      return { qid: q.qid, label: q.label, text };
    })
    .filter((x) => x.text.trim() !== '');

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 96, gap: 16 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    >
      {answered.length > 0 && (
        <YStack gap={8} padding={12} borderRadius={12} backgroundColor="$color2">
          <Text fontSize={12} fontWeight="800" opacity={0.7} color={ink}>
            YOUR SURVEY ANSWERS
          </Text>
          {answered.map((x) => (
            <YStack key={x.qid} gap={1}>
              <Text fontSize={12} opacity={0.6} color={ink}>
                {x.label}
              </Text>
              <Text fontSize={14} color={ink}>
                {x.text}
              </Text>
            </YStack>
          ))}
        </YStack>
      )}

      <YStack gap={10}>
        <Text fontSize={13} opacity={0.8} color={ink}>
          Pick an open slot — our onboarding team will meet you then. Greyed-out slots are already
          booked.
        </Text>
        {slotsLoading ? <Spinner testID="slots-loading" color={primary} /> : null}
        {!slotsLoading && slots.length === 0 ? (
          <Text testID="slots-empty" fontSize={13} color={ink} opacity={0.7}>
            No slots are open right now — please check back soon.
          </Text>
        ) : null}
        {slots.length > 0 ? (
          <SlotPicker slots={slots} value={selectedSlot} onChange={setSelectedSlot} />
        ) : null}

        <Text fontSize={14} fontWeight="700" color={ink}>
          Your name
        </Text>
        <Input
          testID="meeting-name"
          aria-label="Your name"
          value={name}
          onChangeText={setName}
          disabled={lockName}
          opacity={lockName ? 0.6 : 1}
        />
        {lockName ? (
          <Text fontSize={11.5} color={ink} opacity={0.55}>
            From your profile.
          </Text>
        ) : null}
        <Text fontSize={14} fontWeight="700" color={ink}>
          Phone *
        </Text>
        <XStack gap={8}>
          <Input
            testID="meeting-ext"
            aria-label="Country code"
            value={ext}
            disabled
            opacity={0.6}
            width={84}
          />
          <Input
            testID="meeting-phone"
            aria-label="Phone"
            value={phone}
            keyboardType="phone-pad"
            disabled
            opacity={0.6}
            flex={1}
          />
        </XStack>
        <Text fontSize={11.5} color={ink} opacity={0.55}>
          From your profile.
        </Text>
        <Text fontSize={14} fontWeight="700" color={ink}>
          Notes (optional)
        </Text>
        <TextArea
          testID="meeting-notes"
          aria-label="Notes"
          value={notes}
          onChangeText={setNotes}
          minHeight={70}
        />
      </YStack>
      {error ? <Text color="$red10">{error}</Text> : null}
      <Button
        testID="primary-action"
        disabled={busy}
        onPress={onSubmit}
        backgroundColor={primary}
        color="white"
        fontWeight="800"
      >
        {busy ? 'Booking…' : 'Book this slot'}
      </Button>
    </ScrollView>
  );
}
