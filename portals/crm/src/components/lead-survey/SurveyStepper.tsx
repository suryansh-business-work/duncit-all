import { useMemo, useState } from 'react';
import { Alert, Stack, Step, StepLabel, Stepper, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import {
  crmFirstUnanswered,
  crmSeedSurveyAnswers,
  crmSurveyAnswer,
  crmSurveyAnswerInput,
  type CrmSurveyAnswerInput,
  type CrmSurveyAnswers,
  type CrmSurveyFieldAnswer,
} from '@duncit/utils';
import SurveyQuestionField from './SurveyQuestionField';
import { splitSections } from './surveySections';
import type { LeadSurveyAnswer, LeadSurveyDef } from './queries';
import { useTranslation } from '@duncit/shell';

export type SurveyAnswerInput = CrmSurveyAnswerInput;

interface Props {
  survey: LeadSurveyDef;
  initialAnswers?: LeadSurveyAnswer[];
  submitting: boolean;
  onSubmit: (answers: SurveyAnswerInput[]) => void;
  submitLabel?: string;
}

/** Section-stepped survey form — one step per SECTION; final step submits. */
export default function SurveyStepper({ survey, initialAnswers, submitting, onSubmit, submitLabel }: Readonly<Props>) {
  const { t } = useTranslation();
  const submitLabelText = submitLabel ?? t('crm.components.submit');
  const sections = useMemo(() => splitSections(survey.questions, survey.title || t('crm.common.survey')), [survey, t]);
  const [answers, setAnswers] = useState<CrmSurveyAnswers>(() => crmSeedSurveyAnswers(initialAnswers));
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const get = (qid: string) => crmSurveyAnswer(answers, qid);
  const set = (qid: string, patch: Partial<CrmSurveyFieldAnswer>) => setAnswers((a) => ({ ...a, [qid]: { ...get(qid), ...patch } }));

  const validate = (idx: number) => {
    const missing = crmFirstUnanswered(sections[idx].questions, answers);
    setError(missing ? t('crm.leadSurvey.pleaseAnswer', { vars: { label: missing.label } }) : null);
    return !missing;
  };

  const isLast = step >= sections.length - 1;
  const next = () => { if (validate(step)) setStep((s) => Math.min(s + 1, sections.length - 1)); };
  const submit = () => {
    if (!validate(step)) return;
    onSubmit(crmSurveyAnswerInput(sections.flatMap((s) => s.questions), answers));
  };

  if (sections.length === 0) return <Alert severity="info">{t('crm.components.thisSurveyHasNoQuestions')}</Alert>;
  const active = sections[step];

  return (
    <Stack spacing={2}>
      {sections.length > 1 && (
        <Stepper activeStep={step} alternativeLabel>
          {sections.map((s) => <Step key={s.title}><StepLabel>{s.title}</StepLabel></Step>)}
        </Stepper>
      )}
      <Stack spacing={1.75}>
        <Typography component="h2" variant="subtitle1" sx={{
          fontWeight: 800
        }}>{active.title}</Typography>
        {active.help && <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>{active.help}</Typography>}
        {active.questions.map((q) => (
          <SurveyQuestionField key={q.qid} question={q} answer={get(q.qid)} onChange={(patch) => set(q.qid, patch)} />
        ))}
      </Stack>
      {error && <Alert severity="warning">{error}</Alert>}
      <Stack direction="row" spacing={1.5} sx={{
        justifyContent: "space-between"
      }}>
        <DuncitButton disabled={step === 0 || submitting} onClick={() => setStep((s) => Math.max(0, s - 1))}>{t('crm.leadSurvey.back')}</DuncitButton>
        {isLast ? (
          <DuncitButton variant="contained" onClick={submit} disabled={submitting}>{submitting ? t('shell.common.saving') : submitLabelText}</DuncitButton>
        ) : (
          <DuncitButton variant="contained" onClick={next} disabled={submitting}>{t('crm.leadSurvey.next')}</DuncitButton>
        )}
      </Stack>
    </Stack>
  );
}
