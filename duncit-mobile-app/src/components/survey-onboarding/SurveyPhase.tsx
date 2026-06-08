import { ScrollView } from 'react-native';
import { Button, Input, Text, TextArea, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import type { ActiveSurvey, SurveyQuestion } from '@/graphql/onboarding-survey';
import type { Answer } from './useOnboardingFlow';

interface Props {
  survey: ActiveSurvey;
  answer: {
    get: (qid: string) => Answer;
    set: (qid: string, patch: Partial<Answer>) => void;
    toggle: (q: SurveyQuestion, opt: string) => void;
  };
  busy: boolean;
  error: string | null;
  onSubmit: () => void;
}

/** Renders the matched survey's questions (Section / MCQ / Short / Long). */
export function SurveyPhase({ survey, answer, busy, error, onSubmit }: Props) {
  const { color: ink, primary } = useThemeColors();

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      {survey.questions.map((q) => {
        if (q.type === 'SECTION') {
          return (
            <YStack key={q.qid} gap={2}>
              <Text fontSize={16} fontWeight="800" color={ink}>
                {q.label}
              </Text>
              {q.help ? (
                <Text fontSize={13} opacity={0.7} color={ink}>
                  {q.help}
                </Text>
              ) : null}
            </YStack>
          );
        }
        const a = answer.get(q.qid);
        return (
          <YStack key={q.qid} gap={6}>
            <Text fontSize={14} fontWeight="700" color={ink}>
              {q.label}
              {q.required ? ' *' : ''}
            </Text>
            {q.help ? (
              <Text fontSize={12} opacity={0.7} color={ink}>
                {q.help}
              </Text>
            ) : null}
            {q.type === 'TEXT' && (
              <Input
                testID={`q-${q.qid}`}
                value={a.value}
                onChangeText={(t) => answer.set(q.qid, { value: t })}
              />
            )}
            {q.type === 'TEXTAREA' && (
              <TextArea
                testID={`q-${q.qid}`}
                value={a.value}
                onChangeText={(t) => answer.set(q.qid, { value: t })}
                minHeight={90}
              />
            )}
            {q.type === 'MCQ' &&
              q.options.map((opt) => {
                const selected = q.multi ? a.values.includes(opt) : a.value === opt;
                return (
                  <Button
                    key={opt}
                    testID={`opt-${q.qid}-${opt}`}
                    size="$3"
                    chromeless
                    justifyContent="flex-start"
                    onPress={() =>
                      q.multi ? answer.toggle(q, opt) : answer.set(q.qid, { value: opt })
                    }
                  >
                    <Text color={selected ? primary : ink} fontWeight={selected ? '800' : '400'}>
                      {selected ? '●' : '○'} {opt}
                    </Text>
                  </Button>
                );
              })}
          </YStack>
        );
      })}
      {error ? <Text color="$red10">{error}</Text> : null}
      <Button
        testID="primary-action"
        disabled={busy}
        onPress={onSubmit}
        backgroundColor={primary}
        color="white"
        fontWeight="800"
      >
        {busy ? 'Saving…' : 'Continue'}
      </Button>
    </ScrollView>
  );
}
