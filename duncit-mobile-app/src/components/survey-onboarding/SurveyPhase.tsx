import { useMemo, useState } from 'react';
import { ScrollView } from 'react-native';
import { Button, Input, Text, TextArea, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import type { ActiveSurvey, SurveyQuestion } from '@/graphql/onboarding-survey';
import type { Answer } from './useOnboardingFlow';
import { splitSections } from './surveySections';

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

/** Section-stepped survey — one step per SECTION; final step submits. */
export function SurveyPhase({ survey, answer, busy, error, onSubmit }: Props) {
  const { color: ink, primary } = useThemeColors();
  const sections = useMemo(
    () => splitSections(survey.questions, survey.title || 'Survey'),
    [survey],
  );
  const [step, setStep] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);

  const validate = (idx: number) => {
    // `idx` is always the clamped current step, so `sections[idx]` is defined;
    // the `?? []` is a TS-narrowing fallback only.
    /* istanbul ignore next */
    const stepQuestions = sections[idx]?.questions ?? [];
    for (const q of stepQuestions) {
      if (!q.required) continue;
      const a = answer.get(q.qid);
      const filled = q.type === 'MCQ' && q.multi ? a.values.length > 0 : a.value.trim() !== '';
      if (!filled) {
        setLocalError(`Please answer: ${q.label}`);
        return false;
      }
    }
    setLocalError(null);
    return true;
  };

  const isLast = step >= sections.length - 1;
  const onPrimary = () => {
    if (!validate(step)) return;
    if (isLast) onSubmit();
    else setStep((s) => Math.min(s + 1, sections.length - 1));
  };

  const active = sections[step];
  if (!active) return null;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      {sections.length > 1 && (
        <Text fontSize={12} opacity={0.7} color={ink} fontWeight="700">
          Step {step + 1} of {sections.length}
        </Text>
      )}
      <YStack gap={4}>
        <Text fontSize={16} fontWeight="800" color={ink}>
          {active.title}
        </Text>
        {active.help ? (
          <Text fontSize={13} opacity={0.7} color={ink}>
            {active.help}
          </Text>
        ) : null}
      </YStack>

      {active.questions.map((q) => {
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

      {localError || error ? <Text color="$red10">{localError || error}</Text> : null}

      <XStack gap={10}>
        {step > 0 && (
          <Button
            testID="survey-back"
            flex={1}
            chromeless
            onPress={() => setStep((s) => Math.max(0, s - 1))}
            disabled={busy}
          >
            <Text color={ink} fontWeight="700">
              Back
            </Text>
          </Button>
        )}
        <Button
          testID="primary-action"
          flex={1}
          disabled={busy}
          onPress={onPrimary}
          backgroundColor={primary}
          color="white"
          fontWeight="800"
        >
          {busy ? 'Saving…' : isLast ? 'Continue' : 'Next'}
        </Button>
      </XStack>
    </ScrollView>
  );
}
