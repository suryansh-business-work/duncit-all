import { Controller, type Control } from 'react-hook-form';
import { Checkbox, FormControl, FormControlLabel, FormHelperText } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import type { LiteQuestion } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';
import { RhfSelect } from '../RhfSelect';
import type { RegisterValues } from './register.types';

interface QuestionFieldProps {
  control: Control<RegisterValues>;
  question: LiteQuestion;
}

/** The API stores a checkbox as the word "Yes" or nothing. */
export const CHECKBOX_YES = 'Yes';

/** One registration question, drawn for its type. */
export function QuestionField({ control, question }: Readonly<QuestionFieldProps>) {
  const { t } = useWebT();
  const name = `answers.${question.id}` as const;
  const label = question.required ? `${question.label} *` : question.label;
  const hint = question.required ? t('lite.common.required') : t('lite.common.optional');
  if (question.type === 'CHECKBOX') {
    return (
      <Controller
        control={control}
        name={name}
        render={({ field, fieldState }) => (
          <FormControl error={Boolean(fieldState.error)}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={field.value === CHECKBOX_YES}
                  onChange={(event) => field.onChange(event.target.checked ? CHECKBOX_YES : '')}
                  slotProps={{ input: { 'data-testid': `question-${question.id}` } as Record<string, string> }}
                />
              }
              label={label}
            />
            <FormHelperText>{fieldState.error?.message ?? hint}</FormHelperText>
          </FormControl>
        )}
      />
    );
  }
  if (question.type === 'SELECT') {
    return (
      <RhfSelect
        control={control}
        name={name}
        label={label}
        options={question.options.map((option) => ({ value: option, label: option }))}
        emptyLabel={question.required ? undefined : t('liteWeb.register.noAnswer')}
        hint={hint}
        testId={`question-${question.id}`}
      />
    );
  }
  return (
    <RhfTextField
      control={control}
      name={name}
      label={label}
      hint={hint}
      multiline={question.type === 'LONG_TEXT'}
      minRows={question.type === 'LONG_TEXT' ? 3 : undefined}
      slotProps={{ htmlInput: { 'data-testid': `question-${question.id}` } }}
    />
  );
}
