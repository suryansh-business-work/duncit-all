import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert, Box, Button, Card, CardContent, CircularProgress, FormControlLabel,
  MenuItem, Snackbar, Stack, Switch, TextField, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  CREATE_SURVEY, SURVEY_BY_ID, UPDATE_SURVEY,
  type QuestionType, type Survey, type SurveyKind,
} from './queries';
import QuestionCard, { type DraftQuestion } from './QuestionCard';
import ScopePicker, { type Scope } from './ScopePicker';

const blankByType = (type: QuestionType): DraftQuestion => ({ type, label: '', help: '', required: false, multi: false, options: type === 'MCQ' ? [''] : [] });
const emptyScope: Scope = { super_category_id: '', category_id: '', sub_category_id: '' };

/** Create / edit a single onboarding survey scoped to a taxonomy slot. */
export default function SurveyBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id;

  const { data, loading } = useQuery<{ surveyById: Survey | null }>(SURVEY_BY_ID, { variables: { id }, skip: isNew, fetchPolicy: 'cache-and-network' });
  const [createSurvey, { loading: creating }] = useMutation(CREATE_SURVEY);
  const [updateSurvey, { loading: updating }] = useMutation(UPDATE_SURVEY);

  const [kind, setKind] = useState<SurveyKind>('VENUE');
  const [scope, setScope] = useState<Scope>(emptyScope);
  const [title, setTitle] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [addType, setAddType] = useState<QuestionType>('TEXT');
  const [snack, setSnack] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s = data?.surveyById;
    if (!s) return;
    setKind(s.kind);
    setScope({ super_category_id: s.super_category_id ?? '', category_id: s.category_id ?? '', sub_category_id: s.sub_category_id ?? '' });
    setTitle(s.title ?? '');
    setIsActive(s.is_active);
    setQuestions((s.questions ?? []).map((q) => ({ qid: q.qid, type: q.type, label: q.label, help: q.help ?? '', required: q.required, multi: q.multi, options: q.options ?? [] })));
  }, [data]);

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= questions.length) return;
    const copy = [...questions];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    setQuestions(copy);
  };

  const save = async () => {
    setError(null);
    const input = {
      super_category_id: scope.super_category_id || null,
      category_id: scope.category_id || null,
      sub_category_id: scope.sub_category_id || null,
      title,
      is_active: isActive,
      questions: questions.map((q) => ({ qid: q.qid, type: q.type, label: q.label, help: q.help, required: q.required, multi: q.multi, options: q.options })),
    };
    try {
      if (isNew) {
        const res = await createSurvey({ variables: { input: { kind, ...input } } });
        const newId = res.data?.createSurvey?.id;
        setSnack('Survey created');
        if (newId) navigate(`/surveys/${newId}/edit`, { replace: true });
      } else {
        await updateSurvey({ variables: { id, input } });
        setSnack('Survey saved');
      }
    } catch (e: any) {
      setError(e?.message ?? 'Could not save survey');
    }
  };

  const saving = creating || updating;

  return (
    <Stack spacing={2.5}>
      <Box>
        <Button startIcon={<ArrowBackIcon />} size="small" onClick={() => navigate('/surveys')}>Back to Surveys</Button>
      </Box>
      <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={800}>{isNew ? 'New survey' : 'Edit survey'}</Typography>
          <Typography variant="body2" color="text.secondary">Scope a survey to a category slot. Leave categories empty for the kind-level default.</Typography>
        </Box>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save survey'}</Button>
      </Stack>

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

      {loading && !data ? (
        <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress /></Stack>
      ) : (
        <>
          <Card variant="outlined"><CardContent>
            <Stack spacing={1.75}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
                <TextField select size="small" label="Kind" value={kind} onChange={(e) => setKind(e.target.value as SurveyKind)} sx={{ minWidth: 160 }}>
                  <MenuItem value="VENUE">Venue</MenuItem>
                  <MenuItem value="HOST">Host</MenuItem>
                  <MenuItem value="ECOMM">Ecomm (Seller)</MenuItem>
                </TextField>
                <TextField size="small" label="Survey title" value={title} onChange={(e) => setTitle(e.target.value)} sx={{ flex: 1 }} fullWidth />
                <FormControlLabel control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />} label="Active" />
              </Stack>
              <ScopePicker value={scope} onChange={setScope} emptyLabel="— Kind default —" />
            </Stack>
          </CardContent></Card>

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
