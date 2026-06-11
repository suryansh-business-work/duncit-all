import {
  Card,
  CardContent,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import DeleteIcon from '@mui/icons-material/Delete';
import type { QuestionType, SurveyQuestion } from './queries';
import OptionsEditor from './OptionsEditor';

export type DraftQuestion = Omit<SurveyQuestion, 'qid' | 'sort_order'> & { qid?: string };

const TYPES: { value: QuestionType; label: string }[] = [
  { value: 'SECTION', label: 'Section heading' },
  { value: 'MCQ', label: 'Multiple choice (MCQ)' },
  { value: 'TEXT', label: 'Short text' },
  { value: 'TEXTAREA', label: 'Long text' },
];

interface Props {
  question: DraftQuestion;
  index: number;
  total: number;
  onChange: (next: DraftQuestion) => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
}

export default function QuestionCard({ question, index, total, onChange, onMove, onDelete }: Readonly<Props>) {
  const set = (patch: Partial<DraftQuestion>) => onChange({ ...question, ...patch });
  const isSection = question.type === 'SECTION';

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>Q{index + 1}</Typography>
          <Tooltip title="Move up"><span><IconButton size="small" onClick={() => onMove(-1)} disabled={index === 0}><ArrowUpwardIcon fontSize="small" /></IconButton></span></Tooltip>
          <Tooltip title="Move down"><span><IconButton size="small" onClick={() => onMove(1)} disabled={index === total - 1}><ArrowDownwardIcon fontSize="small" /></IconButton></span></Tooltip>
          <Tooltip title="Delete"><IconButton size="small" color="error" onClick={onDelete}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
        </Stack>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            <TextField select size="small" label="Type" value={question.type} onChange={(e) => set({ type: e.target.value as QuestionType })} sx={{ minWidth: 200 }}>
              {TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
            </TextField>
            <TextField size="small" label={isSection ? 'Heading' : 'Question'} value={question.label} onChange={(e) => set({ label: e.target.value })} sx={{ flex: 1, minWidth: 220 }} />
          </Stack>
          <TextField size="small" label="Help text (optional)" value={question.help ?? ''} onChange={(e) => set({ help: e.target.value })} fullWidth />
          {question.type === 'MCQ' && (
            <>
              <OptionsEditor options={question.options ?? []} onChange={(options) => set({ options })} />
              <FormControlLabel control={<Switch checked={!!question.multi} onChange={(e) => set({ multi: e.target.checked })} />} label="Allow multiple answers" />
            </>
          )}
          {!isSection && (
            <FormControlLabel control={<Switch checked={!!question.required} onChange={(e) => set({ required: e.target.checked })} />} label="Required" />
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
