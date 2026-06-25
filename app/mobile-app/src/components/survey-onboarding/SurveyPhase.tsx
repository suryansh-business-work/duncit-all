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
export function SurveyPhase({ survey, answer, busy, error, onSubmit }: Readonly<Props>) {
  const { color: ink, primary } = useThemeColors();
  const sections = useMemo(
    () => splitSections(survey.questions, survey.title || 'Survey'),
    [survey],
  );
  const [step, setStep] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);
  const [missing, setMissing] = useState<Set<string>>(new Set());

  const isFilled = (q: SurveyQuestion) => {
    const a = answer.get(q.qid);
    return q.type === 'MCQ' && q.multi ? a.values.length > 0 : a.value.trim() !== '';
  };

  const validate = (idx: number) => {
    // `idx` is always the clamped current step, so `sections[idx]` is defined;
    // the `?? []` is a TS-narrowing fallback only.
    /* istanbul ignore next */
    const stepQuestions = sections[idx]?.questions ?? [];
    const unanswered = new Set(
      stepQuestions.filter((q) => q.required && !isFilled(q)).map((q) => q.qid),
    );
    setMissing(unanswered);
    if (unanswered.size > 0) {
      setLocalError('Please answer all required questions.');
      return false;
    }
    setLocalError(null);
    return true;
  };

  const isLast = step >= sections.length - 1;
  const idlePrimaryLabel = isLast ? 'Continue' : 'Next';
  const primaryLabel = busy ? 'Saving…' : idlePrimaryLabel;
  const onPrimary = () => {
    if (!validate(step)) return;
    if (isLast) onSubmit();
    else setStep((s) => Math.min(s + 1, sections.length - 1));
  };

  const active = sections[step];
  if (!active) return null;

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 96, gap: 16 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    >
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
            {missing.has(q.qid) ? (
              <Text testID={`required-${q.qid}`} fontSize={12} color="$red10">
                This field is required.
              </Text>
            ) : null}
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
          {primaryLabel}
        </Button>
      </XStack>
    </ScrollView>
  );
}
