import { useMemo, useState } from 'react';
import { Input, Text, TextArea, XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { StepProgressBar } from '@/components/StepProgressBar';
import { useBottomInset } from '@/hooks/useBottomNavSpace';
import type { ActiveSurvey, SurveyQuestion } from '@/graphql/onboarding-survey';
import type { Answer } from './useOnboardingFlow';
import { CALM_FIELD } from './calmField';
import { SurveyOption } from './SurveyOption';
import { splitSections } from './surveySections';
import { RefreshScrollView } from '@/components/PullToRefresh';
import { useTranslation } from '@/hooks/useTranslation';

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
  const { t } = useTranslation();
  // The Next/Continue button is the last row of this scroll and nothing floats
  // over it, so it only has to clear the Android navigation bar the edge-to-edge
  // window paints over the app — on top of the container's own 16pt padding.
  const bottomInset = useBottomInset();
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
    <RefreshScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: bottomInset + 16, gap: 16 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    >
      {/* The bar replaces the old "Step X of N" line; the section names itself below. */}
      {sections.length > 1 && (
        <StepProgressBar
          steps={sections.map((s) => s.title)}
          current={step + 1}
          label={active.title}
        />
      )}
      <YStack gap={4}>
        <Text fontSize={17} fontWeight="600" color="$color">
          {active.title}
        </Text>
        {active.help ? (
          <Text fontSize={13} color="$muted">
            {active.help}
          </Text>
        ) : null}
      </YStack>

      {active.questions.map((q) => {
        const a = answer.get(q.qid);
        return (
          <YStack key={q.qid} gap={6}>
            <Text fontSize={14} fontWeight="600" color="$color">
              {q.label}
              {q.required ? ' *' : ''}
            </Text>
            {q.help ? (
              <Text fontSize={12} color="$muted">
                {q.help}
              </Text>
            ) : null}
            {q.type === 'TEXT' && (
              <Input
                aria-label={q.label}
                testID={`q-${q.qid}`}
                value={a.value}
                onChangeText={(t) => answer.set(q.qid, { value: t })}
                {...CALM_FIELD}
              />
            )}
            {q.type === 'TEXTAREA' && (
              <TextArea
                aria-label={q.label}
                testID={`q-${q.qid}`}
                value={a.value}
                onChangeText={(t) => answer.set(q.qid, { value: t })}
                {...CALM_FIELD}
                minHeight={90}
              />
            )}
            {q.type === 'MCQ' &&
              q.options.map((opt) => (
                <SurveyOption
                  key={opt}
                  testID={`opt-${q.qid}-${opt}`}
                  label={opt}
                  multi={!!q.multi}
                  selected={q.multi ? a.values.includes(opt) : a.value === opt}
                  onPress={() =>
                    q.multi ? answer.toggle(q, opt) : answer.set(q.qid, { value: opt })
                  }
                />
              ))}
            {missing.has(q.qid) ? (
              <Text testID={`required-${q.qid}`} fontSize={12} color="$danger">
                {t('mweb.surveyOnboarding.fieldRequired')}
              </Text>
            ) : null}
          </YStack>
        );
      })}

      {localError || error ? <Text color="$danger">{localError || error}</Text> : null}

      <XStack gap={12}>
        {step > 0 && (
          <YStack flex={1}>
            <DuncitButton
              testID="survey-back"
              label={t('mweb.common.back')}
              variant="ghost"
              size="lg"
              fullWidth
              disabled={busy}
              onPress={() => setStep((s) => Math.max(0, s - 1))}
            />
          </YStack>
        )}
        <YStack flex={1}>
          <DuncitButton
            testID="primary-action"
            label={primaryLabel}
            size="lg"
            fullWidth
            disabled={busy}
            onPress={onPrimary}
          />
        </YStack>
      </XStack>
    </RefreshScrollView>
  );
}
