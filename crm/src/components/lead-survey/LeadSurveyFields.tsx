import { useMemo, useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Alert, Button, Checkbox, FormControl, FormControlLabel, FormGroup, Radio,
  RadioGroup, Snackbar, Stack, TextField, Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import {
  SAVE_LEAD_SURVEY_RESPONSE,
  type LeadSurveyDef,
  type LeadSurveyEntity,
  type LeadSurveyQuestion,
  type LeadSurveyResponse,
} from './queries';
import { parseApiError } from '../../utils/parseApiError';

interface Props {
  entity: LeadSurveyEntity;
  leadId: string;
  survey: LeadSurveyDef;
  response: LeadSurveyResponse | null;
  onSaved: () => void;
}

type AnswerState = Record<string, { value: string; values: string[] }>;

const seed = (response: LeadSurveyResponse | null): AnswerState => {
  const out: AnswerState = {};
  for (const a of response?.answers ?? []) out[a.qid] = { value: a.value ?? '', values: a.values ?? [] };
  return out;
};

const inputQuestions = (s: LeadSurveyDef) => s.questions.filter((q) => q.type !== 'SECTION');

/** Fillable survey form for a single lead; persists answers onto the lead. */
export default function LeadSurveyFields({ entity, leadId, survey, response, onSaved }: Props) {
  const [answers, setAnswers] = useState<AnswerState>(() => seed(response));
  const [error, setError] = useState<string | null>(null);
  const [snack, setSnack] = useState<string | null>(null);
  const [save, { loading: saving }] = useMutation(SAVE_LEAD_SURVEY_RESPONSE);

  const get = (qid: string) => answers[qid] ?? { value: '', values: [] };
  const set = (qid: string, patch: Partial<{ value: string; values: string[] }>) =>
    setAnswers((a) => ({ ...a, [qid]: { ...get(qid), ...patch } }));
  const toggle = (q: LeadSurveyQuestion, opt: string) => {
    const cur = get(q.qid).values;
    set(q.qid, { values: cur.includes(opt) ? cur.filter((v) => v !== opt) : [...cur, opt] });
  };

  const inputs = useMemo(() => inputQuestions(survey), [survey]);

  const onSubmit = async () => {
    for (const q of inputs) {
      if (!q.required) continue;
      const a = get(q.qid);
      const filled = q.type === 'MCQ' && q.multi ? a.values.length > 0 : (a.value ?? '').trim() !== '';
      if (!filled) { setError(`Please answer: ${q.label}`); return; }
    }
    setError(null);
    try {
      const payload = inputs.map((q) =>
        q.type === 'MCQ' && q.multi ? { qid: q.qid, values: get(q.qid).values } : { qid: q.qid, value: get(q.qid).value }
      );
      await save({ variables: { entity, lead_id: leadId, survey_id: survey.id, answers: payload } });
      setSnack('Survey saved');
      onSaved();
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  return (
    <Stack spacing={2}>
      {survey.questions.map((q) => {
        if (q.type === 'SECTION') {
          return (
            <Stack key={q.qid} spacing={0.25} sx={{ pt: 1 }}>
              <Typography variant="subtitle2" fontWeight={800}>{q.label}</Typography>
              {q.help && <Typography variant="caption" color="text.secondary">{q.help}</Typography>}
            </Stack>
          );
        }
        const a = get(q.qid);
        return (
          <FormControl key={q.qid} component="fieldset" fullWidth>
            <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>{q.label}{q.required ? ' *' : ''}</Typography>
            {q.help && <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>{q.help}</Typography>}
            {q.type === 'TEXT' && <TextField size="small" value={a.value} onChange={(e) => set(q.qid, { value: e.target.value })} fullWidth />}
            {q.type === 'TEXTAREA' && <TextField size="small" value={a.value} onChange={(e) => set(q.qid, { value: e.target.value })} fullWidth multiline minRows={3} />}
            {q.type === 'MCQ' && q.multi && (
              <FormGroup>
                {q.options.map((opt) => (
                  <FormControlLabel key={opt} control={<Checkbox checked={a.values.includes(opt)} onChange={() => toggle(q, opt)} />} label={opt} />
                ))}
              </FormGroup>
            )}
            {q.type === 'MCQ' && !q.multi && (
              <RadioGroup value={a.value} onChange={(e) => set(q.qid, { value: e.target.value })}>
                {q.options.map((opt) => <FormControlLabel key={opt} value={opt} control={<Radio />} label={opt} />)}
              </RadioGroup>
            )}
          </FormControl>
        );
      })}
      {error && <Alert severity="warning" onClose={() => setError(null)}>{error}</Alert>}
      <Button variant="contained" startIcon={<SaveIcon />} onClick={onSubmit} disabled={saving} sx={{ alignSelf: 'flex-start' }}>
        {saving ? 'Saving…' : 'Save survey'}
      </Button>
      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack(null)} message={snack ?? ''} />
    </Stack>
  );
}
