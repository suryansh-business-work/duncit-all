import { ScrollView } from 'react-native';
import { Button, Input, Text, TextArea, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  when: string;
  setWhen: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  busy: boolean;
  error: string | null;
  onSubmit: () => void;
}

/** Onboarding meeting request — shown when no survey matched or after submitting it. */
export function MeetingPhase({ when, setWhen, notes, setNotes, busy, error, onSubmit }: Props) {
  const { color: ink, primary } = useThemeColors();

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
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
