import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { SURVEY, UPSERT_SURVEY, type QuestionType, type Survey, type SurveyKind } from './queries';
import QuestionCard, { type DraftQuestion } from './QuestionCard';

const KINDS: SurveyKind[] = ['VENUE', 'HOST'];
const blankByType = (type: QuestionType): DraftQuestion => ({ type, label: '', help: '', required: false, multi: false, options: type === 'MCQ' ? [''] : [] });

/** Onboarding survey builder for a venue/host survey (one per kind). */
export default function SurveyBuilderPage() {
  const params = useParams<{ kind: string }>();
  const kind = (params.kind?.toUpperCase() as SurveyKind) || 'VENUE';
  const valid = KINDS.includes(kind);

  const { data, loading, refetch } = useQuery<{ survey: Survey | null }>(SURVEY, { variables: { kind }, skip: !valid, fetchPolicy: 'cache-and-network' });
  const [upsert, { loading: saving }] = useMutation(UPSERT_SURVEY);
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [addType, setAddType] = useState<QuestionType>('TEXT');
  const [snack, setSnack] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s = data?.survey;
    setTitle(s?.title ?? '');
    setQuestions((s?.questions ?? []).map((q) => ({ qid: q.qid, type: q.type, label: q.label, help: q.help ?? '', required: q.required, multi: q.multi, options: q.options ?? [] })));
  }, [data]);

  const heading = useMemo(() => (kind === 'VENUE' ? 'Venue Survey' : 'Host Survey'), [kind]);

  if (!valid) return <Alert severity="error">Unknown survey kind.</Alert>;

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= questions.length) return;
    const copy = [...questions];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    setQuestions(copy);
  };

  const save = async () => {
    setError(null);
    try {
      await upsert({
        variables: {
          kind,
          input: {
            title,
            questions: questions.map((q) => ({ qid: q.qid, type: q.type, label: q.label, help: q.help, required: q.required, multi: q.multi, options: q.options })),
          },
        },
      });
      await refetch();
      setSnack('Survey saved');
    } catch (e: any) {
      setError(e?.message ?? 'Could not save survey');
    }
  };

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
        <AssignmentIcon color="primary" />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={800}>{heading}</Typography>
          <Typography variant="body2" color="text.secondary">Shown before a user {kind === 'VENUE' ? 'registers a venue' : 'becomes a host'}. Responses appear in the user's admin profile.</Typography>
        </Box>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save survey'}</Button>
      </Stack>

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

      {loading && !data ? (
        <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress /></Stack>
      ) : (
        <>
          <TextField size="small" label="Survey title" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />
          {questions.map((q, i) => (
            <QuestionCard
              key={q.qid ?? `new-${i}`}
              question={q}
              index={i}
              total={questions.length}
              onChange={(next) => setQuestions(questions.map((x, idx) => (idx === i ? next : x)))}
              onMove={(dir) => move(i, dir)}
              onDelete={() => setQuestions(questions.filter((_, idx) => idx !== i))}
            />
          ))}
          <Stack direction="row" spacing={1.5} alignItems="center">
            <TextField select size="small" label="Add" value={addType} onChange={(e) => setAddType(e.target.value as QuestionType)} sx={{ minWidth: 200 }}>
              <MenuItem value="SECTION">Section heading</MenuItem>
              <MenuItem value="MCQ">Multiple choice</MenuItem>
              <MenuItem value="TEXT">Short text</MenuItem>
              <MenuItem value="TEXTAREA">Long text</MenuItem>
            </TextField>
            <Button startIcon={<AddIcon />} onClick={() => setQuestions([...questions, blankByType(addType)])}>Add question</Button>
          </Stack>
        </>
      )}

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack(null)} message={snack ?? ''} />
    </Stack>
  );
}
