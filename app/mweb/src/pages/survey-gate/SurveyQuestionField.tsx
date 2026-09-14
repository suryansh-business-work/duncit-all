import { Checkbox, FormControl, FormControlLabel, FormGroup, Radio, RadioGroup, TextField, Typography } from '@mui/material';
import type { SurveyQuestion } from './queries';

export interface FieldAnswer {
  value: string;
  values: string[];
}

interface Props {
  question: SurveyQuestion;
  answer: FieldAnswer;
  onChange: (patch: Partial<FieldAnswer>) => void;
}

/** Renders a single survey question input (TEXT / TEXTAREA / MCQ single|multi). */
export default function SurveyQuestionField({ question: q, answer, onChange }: Readonly<Props>) {
  const toggle = (opt: string) => {
    const cur = answer.values;
    onChange({ values: cur.includes(opt) ? cur.filter((v) => v !== opt) : [...cur, opt] });
  };

  const inputTestId = `q-${q.qid}-input`;
  return (
    <FormControl component="fieldset" fullWidth data-testid={`survey-question-${q.qid}`}>
      <Typography
        variant="body2"
        sx={{
          fontWeight: 600,
          mb: 0.5
        }}>{q.label}{q.required ? ' *' : ''}</Typography>
      {q.help && <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          mb: 0.5
        }}>{q.help}</Typography>}
      {q.type === 'TEXT' && (
        <TextField
          size="small"
          value={answer.value}
          onChange={(e) => onChange({ value: e.target.value })}
          fullWidth
          data-testid={`q-${q.qid}`}
          slotProps={{ htmlInput: { 'data-testid': inputTestId } }}
        />
      )}
      {q.type === 'TEXTAREA' && (
        <TextField
          size="small"
          value={answer.value}
          onChange={(e) => onChange({ value: e.target.value })}
          fullWidth
          multiline
          minRows={3}
          data-testid={`q-${q.qid}`}
          slotProps={{ htmlInput: { 'data-testid': inputTestId } }}
        />
      )}
      {q.type === 'MCQ' && q.multi && (
        <FormGroup>
          {q.options.map((opt) => (
            <FormControlLabel key={opt} control={<Checkbox checked={answer.values.includes(opt)} onChange={() => toggle(opt)} data-testid={`opt-${q.qid}-${opt}`} />} label={opt} />
          ))}
        </FormGroup>
      )}
      {q.type === 'MCQ' && !q.multi && (
        <RadioGroup value={answer.value} onChange={(e) => onChange({ value: e.target.value })}>
          {q.options.map((opt) => <FormControlLabel key={opt} value={opt} control={<Radio data-testid={`opt-${q.qid}-${opt}`} />} label={opt} />)}
        </RadioGroup>
      )}
    </FormControl>
  );
}
