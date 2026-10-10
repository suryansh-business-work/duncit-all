import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MenuItem, Stack, TextField } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../../i18n/useTranslation';
import { buildJudgeSheetSchema, type JudgeCriterion, type JudgeSheetValues } from './judge-sheet.types';

export interface JudgeSheetFormProps {
  criteria: JudgeCriterion[];
  competitors: { competitor_id: string; name: string }[];
  saving: boolean;
  /** Resolves true when the sheet was saved (the form then clears for the next competitor). */
  onSubmit: (values: JudgeSheetValues) => Promise<boolean>;
}

export function JudgeSheetForm({ criteria, competitors, saving, onSubmit }: Readonly<JudgeSheetFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => buildJudgeSheetSchema(t, criteria), [t, criteria]);
  const { control, handleSubmit, reset } = useForm<JudgeSheetValues>({
    resolver: zodResolver(schema),
    defaultValues: { candidate_id: competitors[0]?.competitor_id ?? '', marks: {} },
  });
  const submit = async (values: JudgeSheetValues) => {
    if (await onSubmit(values)) reset({ candidate_id: values.candidate_id, marks: {} });
  };

  return (
    <Stack spacing={1.5} component="form" noValidate onSubmit={handleSubmit(submit)}>
      <Controller
        name="candidate_id"
        control={control}
        render={({ field, fieldState }) => (
          <TextField select size="small" label={t('mweb.challenge.judgeCompetitor')} {...field} error={!!fieldState.error} helperText={fieldState.error?.message}>
            {competitors.map((c) => (
              <MenuItem key={c.competitor_id} value={c.competitor_id}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>
        )}
      />
      {criteria.map((c) => (
        <Controller
          key={c.key}
          name={`marks.${c.key}`}
          control={control}
          render={({ field, fieldState }) => (
            <TextField
              type="number"
              size="small"
              required
              label={t('mweb.challenge.criterionOutOf', { vars: { label: c.label, max: c.max } })}
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
              slotProps={{ htmlInput: { min: 0, max: c.max, step: 0.5 } }}
            />
          )}
        />
      ))}
      <DuncitButton type="submit" variant="contained" disabled={saving}>
        {t('mweb.challenge.submitScores')}
      </DuncitButton>
    </Stack>
  );
}
