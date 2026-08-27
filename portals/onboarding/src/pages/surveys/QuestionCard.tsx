import { Card, CardContent, FormControlLabel, MenuItem, Stack, Switch, TextField, Tooltip, Typography } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import DeleteIcon from '@mui/icons-material/Delete';
import { DuncitIconButton } from '@duncit/buttons';
import type { QuestionType, SurveyQuestion } from './queries';
import OptionsEditor from './OptionsEditor';
import { useTranslation } from '@duncit/app-settings';

export type DraftQuestion = Omit<SurveyQuestion, 'qid' | 'sort_order'> & { qid?: string };

type Translate = ReturnType<typeof useTranslation>['t'];

const types = (t: Translate): { value: QuestionType; label: string }[] => [
  { value: 'SECTION', label: t('onboarding.surveys.sectionHeading') },
  { value: 'MCQ', label: t('onboarding.surveys.multipleChoiceMcq') },
  { value: 'TEXT', label: t('onboarding.surveys.shortText') },
  { value: 'TEXTAREA', label: t('onboarding.surveys.longText') },
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
  const { t } = useTranslation();
  const set = (patch: Partial<DraftQuestion>) => onChange({ ...question, ...patch });
  const isSection = question.type === 'SECTION';

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            mb: 1
          }}>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              flex: 1
            }}>Q{index + 1}</Typography>
          <Tooltip title={t('onboarding.common.moveUp')}><span><DuncitIconButton size="small" onClick={() => onMove(-1)} disabled={index === 0}><ArrowUpwardIcon fontSize="small" /></DuncitIconButton></span></Tooltip>
          <Tooltip title={t('onboarding.common.moveDown')}><span><DuncitIconButton size="small" onClick={() => onMove(1)} disabled={index === total - 1}><ArrowDownwardIcon fontSize="small" /></DuncitIconButton></span></Tooltip>
          <Tooltip title={t('shell.common.delete')}><DuncitIconButton size="small" color="error" onClick={onDelete}><DeleteIcon fontSize="small" /></DuncitIconButton></Tooltip>
        </Stack>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1.5} useFlexGap sx={{
            flexWrap: "wrap"
          }}>
            <TextField select size="small" label={t('shell.common.type')} value={question.type} onChange={(e) => set({ type: e.target.value as QuestionType })} sx={{ minWidth: 200 }}>
              {types(t).map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
            </TextField>
            <TextField size="small" label={isSection ? 'Heading' : 'Question'} value={question.label} onChange={(e) => set({ label: e.target.value })} sx={{ flex: 1, minWidth: 220 }} />
          </Stack>
          <TextField size="small" label={t('onboarding.surveys.helpTextOptional')} value={question.help ?? ''} onChange={(e) => set({ help: e.target.value })} fullWidth />
          {question.type === 'MCQ' && (
            <>
              <OptionsEditor options={question.options ?? []} onChange={(options) => set({ options })} />
              <FormControlLabel control={<Switch checked={!!question.multi} onChange={(e) => set({ multi: e.target.checked })} />} label={t('onboarding.surveys.allowMultipleAnswers')} />
            </>
          )}
          {!isSection && (
            <FormControlLabel control={<Switch checked={!!question.required} onChange={(e) => set({ required: e.target.checked })} />} label={t('onboarding.surveys.required')} />
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
