import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { Alert, Button, Stack, Step, StepLabel, Stepper, Typography } from '@mui/material';
import SurveyQuestionField, { type FieldAnswer } from './SurveyQuestionField';
import { splitSections } from './surveySections';
import type { ActiveSurvey } from './queries';

export interface SurveyAnswerInput {
  qid: string;
  value?: string | null;
  values?: string[];
}

export type SurveyAnswerState = Record<string, FieldAnswer>;

interface Props {
  survey: ActiveSurvey;
  submitting: boolean;
  onSubmit: (answers: SurveyAnswerInput[]) => void;
  submitLabel?: string;
  // Optionally hand answer ownership to the parent so an in-progress survey
  // survives a Back navigation (the page unmounts, the draft cache keeps them).
  // Falls back to internal state when omitted.
  answers?: SurveyAnswerState;
  setAnswers?: Dispatch<SetStateAction<SurveyAnswerState>>;
}

/** Section-stepped survey — one step per SECTION; final step calls onSubmit. */
export default function SurveyStepper({
  survey,
  submitting,
  onSubmit,
  submitLabel = 'Continue',
  answers: answersProp,
  setAnswers: setAnswersProp,
}: Readonly<Props>) {
  const sections = useMemo(() => splitSections(survey.questions, survey.title || 'Survey'), [survey]);
  const [localAnswers, setLocalAnswers] = useState<SurveyAnswerState>({});
  const answers = answersProp ?? localAnswers;
  const setAnswers = setAnswersProp ?? setLocalAnswers;
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const get = (qid: string): FieldAnswer => answers[qid] ?? { value: '', values: [] };
  const set = (qid: string, patch: Partial<FieldAnswer>) => setAnswers((a) => ({ ...a, [qid]: { ...get(qid), ...patch } }));

  const validate = (idx: number) => {
    for (const q of sections[idx]?.questions ?? []) {
      if (!q.required) continue;
      const a = get(q.qid);
      const filled = q.type === 'MCQ' && q.multi ? a.values.length > 0 : (a.value ?? '').trim() !== '';
      if (!filled) { setError(`This field is required: ${q.label}`); return false; }
    }
    setError(null);
    return true;
  };

  const isLast = step >= sections.length - 1;
  const next = () => { if (validate(step)) setStep((s) => Math.min(s + 1, sections.length - 1)); };
  const submit = () => {
    if (!validate(step)) return;
    const payload: SurveyAnswerInput[] = sections
      .flatMap((s) => s.questions)
      .map((q) => (q.type === 'MCQ' && q.multi ? { qid: q.qid, values: get(q.qid).values } : { qid: q.qid, value: get(q.qid).value }));
    onSubmit(payload);
  };

  if (sections.length === 0) {
    return <Button variant="contained" size="large" onClick={() => onSubmit([])} disabled={submitting} sx={{ borderRadius: 999, fontWeight: 900 }}>{submitLabel}</Button>;
  }
  const active = sections[step];

  return (
    <Stack spacing={2}>
      {sections.length > 1 && (
        <Stepper activeStep={step} alternativeLabel>
          {sections.map((s) => <Step key={s.title}><StepLabel>{s.title}</StepLabel></Step>)}
        </Stepper>
      )}
      <Stack spacing={1.75}>
        <Typography variant="subtitle1" fontWeight={800}>{active.title}</Typography>
        {active.help && <Typography variant="body2" color="text.secondary">{active.help}</Typography>}
        {active.questions.map((q) => (
          <SurveyQuestionField key={q.qid} question={q} answer={get(q.qid)} onChange={(patch) => set(q.qid, patch)} />
        ))}
      </Stack>
      {error && <Alert severity="warning">{error}</Alert>}
      <Stack direction="row" spacing={1.5} justifyContent="space-between">
        <Button disabled={step === 0 || submitting} onClick={() => setStep((s) => Math.max(0, s - 1))}>Back</Button>
        {isLast ? (
          <Button variant="contained" onClick={submit} disabled={submitting} sx={{ borderRadius: 999, fontWeight: 900 }}>{submitting ? 'Submitting…' : submitLabel}</Button>
        ) : (
          <Button variant="contained" onClick={next} disabled={submitting} sx={{ borderRadius: 999, fontWeight: 900 }}>Next</Button>
        )}
      </Stack>
    </Stack>
  );
}
