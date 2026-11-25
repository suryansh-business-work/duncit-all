import { useMemo, useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';
import {
  crmFirstUnanswered,
  crmSeedSurveyAnswers,
  crmSplitSurveySections,
  crmSurveyAnswer,
  crmSurveyAnswerInput,
  type CrmSurveyAnswerInput,
  type CrmSurveyAnswers,
} from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { useTranslation } from '@/hooks/useTranslation';
import type { LeadSurveyDef, LeadSurveyEntry } from './SurveyState';
import { SurveyQuestion } from './SurveyQuestion';
import { TabAlert } from './TabAlert';

interface Props {
  survey: LeadSurveyDef;
  initialAnswers?: LeadSurveyEntry['answers'];
  submitting: boolean;
  onSubmit: (answers: CrmSurveyAnswerInput[]) => void;
}

/**
 * The survey as the portal's stepper: one step per section, each step's
 * required questions checked before moving on, every answer sent on the last
 * step (a MANUAL entry in the log).
 */
export function SurveyFill({ survey, initialAnswers, submitting, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const sections = useMemo(
    () => crmSplitSurveySections(survey.questions, survey.title || t('crm.common.survey')),
    [survey, t],
  );
  const [answers, setAnswers] = useState<CrmSurveyAnswers>(() =>
    crmSeedSurveyAnswers(initialAnswers),
  );
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const active = sections[step];
  if (!active)
    return <TabAlert tone="info">{t('crm.components.thisSurveyHasNoQuestions')}</TabAlert>;

  const isLast = step >= sections.length - 1;
  const validate = () => {
    const missing = crmFirstUnanswered(active.questions, answers);
    setError(missing ? t('crm.leadSurvey.pleaseAnswer', { vars: { label: missing.label } }) : null);
    return !missing;
  };
  const next = () => {
    if (validate()) setStep((s) => Math.min(s + 1, sections.length - 1));
  };
  const submit = () => {
    if (validate())
      onSubmit(
        crmSurveyAnswerInput(
          sections.flatMap((s) => s.questions),
          answers,
        ),
      );
  };

  return (
    <YStack gap="$3" testID="survey-fill">
      {sections.length > 1 ? (
        <Text color="$muted" fontSize="$2" aria-live="polite">
          {t('crmApp.survey.step', { vars: { step: step + 1, total: sections.length } })}
        </Text>
      ) : null}
      <Text fontWeight="800" fontSize="$5" role="heading">
        {active.title}
      </Text>
      {active.help ? <Text color="$muted">{active.help}</Text> : null}
      {active.questions.map((q) => (
        <SurveyQuestion
          key={q.qid}
          question={q}
          answer={crmSurveyAnswer(answers, q.qid)}
          onChange={(answer) => setAnswers((all) => ({ ...all, [q.qid]: answer }))}
        />
      ))}
      {error ? <TabAlert tone="warning">{error}</TabAlert> : null}
      <XStack justifyContent="space-between" gap="$2">
        <DuncitButton
          label={t('crm.leadSurvey.back')}
          onPress={() => setStep((s) => Math.max(0, s - 1))}
          variant="ghost"
          disabled={step === 0 || submitting}
          testID="survey-back"
        />
        {isLast ? (
          <DuncitButton
            label={submitting ? t('shell.common.saving') : t('crm.components.saveSurvey')}
            onPress={submit}
            loading={submitting}
            testID="survey-save"
          />
        ) : (
          <DuncitButton
            label={t('crm.leadSurvey.next')}
            onPress={next}
            disabled={submitting}
            testID="survey-next"
          />
        )}
      </XStack>
    </YStack>
  );
}
