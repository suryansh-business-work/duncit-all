import { ScrollView } from 'react-native';
import { Button, Input, Spinner, Text, TextArea, YStack } from 'tamagui';

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
  phone: string;
  setPhone: (v: string) => void;
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
  phone,
  setPhone,
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
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
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
          Your name (optional)
        </Text>
        <Input testID="meeting-name" value={name} onChangeText={setName} />
        <Text fontSize={14} fontWeight="700" color={ink}>
          Phone *
        </Text>
        <Input
          testID="meeting-phone"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <Text fontSize={14} fontWeight="700" color={ink}>
          Notes (optional)
        </Text>
        <TextArea testID="meeting-notes" value={notes} onChangeText={setNotes} minHeight={70} />
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
