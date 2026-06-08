import { ScrollView } from 'react-native';
import { Button, Input, Text, TextArea, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import type { ActiveSurvey } from '@/graphql/onboarding-survey';
import type { Answer } from './useOnboardingFlow';

interface Props {
  survey: ActiveSurvey | null;
  answer: { get: (qid: string) => Answer };
  when: string;
  setWhen: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  busy: boolean;
  error: string | null;
  onSubmit: () => void;
}

/** Meeting request — shown after the survey; recaps the submitted answers on top. */
export function MeetingPhase({
  survey,
  answer,
  when,
  setWhen,
  notes,
  setNotes,
  busy,
  error,
  onSubmit,
}: Props) {
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
          Pick a time that suits you — our team will confirm your onboarding meeting.
        </Text>
        <Text fontSize={14} fontWeight="700" color={ink}>
          Preferred date & time *
        </Text>
        <Input
          testID="meeting-when"
          value={when}
          onChangeText={setWhen}
          placeholder="2026-07-01 15:30"
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
        {busy ? 'Saving…' : 'Request meeting'}
      </Button>
    </ScrollView>
  );
}
