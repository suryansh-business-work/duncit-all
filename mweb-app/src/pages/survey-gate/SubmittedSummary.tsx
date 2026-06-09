import { Paper, Stack, Typography } from '@mui/material';
import type { ActiveSurvey } from './queries';
import type { SurveyAnswerInput } from './SurveyStepper';

interface Props {
  survey: ActiveSurvey;
  answers: SurveyAnswerInput[];
}

/** Read-only recap of the just-submitted survey answers, shown on the meeting step. */
export default function SubmittedSummary({ survey, answers }: Readonly<Props>) {
  const labelFor = (qid: string) => survey.questions.find((q) => q.qid === qid)?.label ?? qid;
  const items = answers.filter((a) => a.values?.length || (a.value ?? '').trim() !== '');
  if (items.length === 0) return null;

  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, mb: 2 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.4 }}>
        YOUR SURVEY ANSWERS
      </Typography>
      <Stack spacing={0.75} sx={{ mt: 0.75 }}>
        {items.map((a) => (
          <Stack key={a.qid} spacing={0.1}>
            <Typography variant="caption" color="text.secondary">{labelFor(a.qid)}</Typography>
            <Typography variant="body2">{a.values?.length ? a.values.join(', ') : a.value}</Typography>
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
}
