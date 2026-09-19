import { useMemo } from 'react';
import { Controller, useFieldArray, useWatch, type Control } from 'react-hook-form';
import { Box, Checkbox, FormControlLabel, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { SectionCard } from '@duncit/ui';
import { useWebT } from '../../../../shared/i18n';
import { RhfSelect, type SelectOption } from '../../../components/RhfSelect';
import { emptyQuestion, QUESTION_TYPES, type EventFormValues } from '../event.types';

interface QuestionRowProps {
  control: Control<EventFormValues>;
  index: number;
  types: readonly SelectOption[];
  onRemove: () => void;
}

function QuestionRow({ control, index, types, onRemove }: Readonly<QuestionRowProps>) {
  const { t } = useWebT();
  const type = useWatch({ control, name: `questions.${index}.type` });
  return (
    <Box component="li" sx={{ border: 1, borderColor: 'divider', borderRadius: 3, p: 2 }} data-testid={`question-row-${index}`}>
      <Stack spacing={1.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <RhfTextField control={control} name={`questions.${index}.label`} label={t('liteWeb.eventForm.questionLabel')} slotProps={{ htmlInput: { maxLength: 200, 'data-testid': `question-label-${index}` } }} />
          <Box sx={{ minWidth: { sm: 200 } }}>
            <RhfSelect control={control} name={`questions.${index}.type`} label={t('liteWeb.eventForm.questionType')} options={types} testId={`question-type-${index}`} />
          </Box>
        </Stack>
        {type === 'SELECT' ? (
          <RhfTextField
            control={control}
            name={`questions.${index}.options`}
            label={t('liteWeb.eventForm.questionOptions')}
            hint={t('liteWeb.eventForm.questionOptionsHint')}
            multiline
            minRows={2}
            slotProps={{ htmlInput: { 'data-testid': `question-options-${index}` } }}
          />
        ) : null}
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Controller
            control={control}
            name={`questions.${index}.required`}
            render={({ field }) => (
              <FormControlLabel
                control={<Checkbox checked={field.value} onChange={(event) => field.onChange(event.target.checked)} inputProps={{ 'data-testid': `question-required-${index}` } as Record<string, string>} />}
                label={t('lite.common.required')}
              />
            )}
          />
          <DuncitIconButton aria-label={t('liteWeb.eventForm.removeQuestion')} onClick={onRemove} data-testid={`question-remove-${index}`}>
            <DeleteOutlineIcon />
          </DuncitIconButton>
        </Stack>
      </Stack>
    </Box>
  );
}

/** What a guest is asked when they register. */
export function QuestionsSection({ control }: Readonly<{ control: Control<EventFormValues> }>) {
  const { t } = useWebT();
  const { fields, append, remove } = useFieldArray({ control, name: 'questions' });
  const types = useMemo(() => QUESTION_TYPES.map((value) => ({ value, label: t(`liteWeb.eventForm.questionTypes.${value}`) })), [t]);
  return (
    <SectionCard
      title={t('liteWeb.eventForm.questions')}
      subtitle={t('liteWeb.eventForm.questionsHint')}
      action={
        <DuncitButton size="small" startIcon={<AddIcon />} onClick={() => append(emptyQuestion())} data-testid="question-add">
          {t('liteWeb.eventForm.addQuestion')}
        </DuncitButton>
      }
    >
      {fields.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t('liteWeb.eventForm.noQuestions')}
        </Typography>
      ) : (
        <Stack component="ul" spacing={2} sx={{ listStyle: 'none', p: 0, m: 0 }}>
          {fields.map((field, index) => (
            <QuestionRow key={field.id} control={control} index={index} types={types} onRemove={() => remove(index)} />
          ))}
        </Stack>
      )}
    </SectionCard>
  );
}
