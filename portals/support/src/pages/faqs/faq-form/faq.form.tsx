import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
} from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import type { FaqCategoryOption, FaqFormValues } from './faq.types';

type Translate = ReturnType<typeof useTranslation>['t'];

interface Props {
  open: boolean;
  title: string;
  categoryLabel: string;
  categoryOptions: FaqCategoryOption[];
  /** Present when the category may be left empty — it labels the "none" option
   *  and turns the field optional. Absent means the category is required. */
  categoryEmptyLabel?: string;
  categoryHint?: string;
  initialValues: FaqFormValues;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit(values: FaqFormValues): Promise<void>;
}

const categoryRule = (t: Translate, required: boolean) => {
  const base = z.string().trim();
  if (required) return base.min(1, t('support.faqs.topicRequired'));
  return base;
};

/** Messages are copy, so the schema is built from the active catalogue. */
export const buildFaqSchema = (t: Translate, categoryRequired: boolean) =>
  z.object({
    category: categoryRule(t, categoryRequired),
    question: z.string().trim().min(5, t('support.faqs.questionMin')).max(300),
    answer: z.string().trim().min(5, t('support.faqs.answerMin')).max(4000),
    sort_order: z.coerce
      .number({ message: t('support.faqs.sortRequired') })
      .int()
      .min(0)
      .max(9999),
    is_active: z.boolean(),
  });

export default function FaqForm({
  open,
  title,
  categoryLabel,
  categoryOptions,
  categoryEmptyLabel,
  categoryHint,
  initialValues,
  saving,
  error,
  onClose,
  onSubmit,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { control, handleSubmit, reset } = useForm<FaqFormValues>({
    defaultValues: initialValues,
    resolver: zodResolver(buildFaqSchema(t, !categoryEmptyLabel)),
    mode: 'onTouched',
  });

  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <RhfTextField
            control={control}
            name="category"
            select
            label={categoryLabel}
            hint={categoryHint}
          >
            {categoryEmptyLabel ? <MenuItem value="">{categoryEmptyLabel}</MenuItem> : null}
            {categoryOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </RhfTextField>
          <RhfTextField
            control={control}
            name="question"
            label={t('support.faqs.question')}
            required
          />
          <RhfTextField
            control={control}
            name="answer"
            label={t('support.faqs.answer')}
            multiline
            minRows={4}
            required
          />
          <Stack direction="row" spacing={2} sx={{
            alignItems: "center"
          }}>
            <RhfTextField
              control={control}
              name="sort_order"
              label={t('support.faqs.sortOrder')}
              type="number"
              sx={{ width: 160 }}
              fullWidth={false}
            />
            <Controller
              control={control}
              name="is_active"
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={!!field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                    />
                  }
                  label={t('support.faqs.active')}
                />
              )}
            />
          </Stack>
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('shell.common.cancel')}</Button>
        <Button variant="contained" onClick={submit} disabled={saving}>
          {saving ? t('shell.common.saving') : t('shell.common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
