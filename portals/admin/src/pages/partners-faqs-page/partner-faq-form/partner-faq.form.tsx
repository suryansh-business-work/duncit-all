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
import { partnerFaqTopics, type PartnerFaqTopic } from './partner-faq.types';
import { useTranslation } from '@duncit/shell';

export interface PartnerFaqFormValues {
  partner_topic: PartnerFaqTopic;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
}

interface Props {
  open: boolean;
  editing: boolean;
  initialValues: PartnerFaqFormValues;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: PartnerFaqFormValues) => Promise<void>;
}

type Translate = ReturnType<typeof useTranslation>['t'];

/** Messages are copy, so the schema is built from the active catalogue. */
export const buildPartnerFaqSchema = (t: Translate) =>
  z.object({
  partner_topic: z.enum(['VENUE', 'HOST', 'PRODUCTS'], { message: t('admin.faqs.topicRequired') }),
  question: z.string().trim().min(5, t('admin.faqs.questionMin')).max(300),
  answer: z.string().trim().min(5, t('admin.faqs.answerMin')).max(4000),
  sort_order: z.coerce
    .number({ message: t('admin.faqs.sortRequired') })
    .int()
    .min(0)
    .max(9999),
  is_active: z.boolean(),
});

export const toPartnerFaqInput = (values: PartnerFaqFormValues, t: Translate) => {
  const cast = buildPartnerFaqSchema(t).parse(values);
  return {
    audience: 'PARTNERS',
    partner_topic: cast.partner_topic,
    question: cast.question.trim(),
    answer: cast.answer.trim(),
    sort_order: Number(cast.sort_order) || 0,
    is_active: cast.is_active,
  };
};

export default function PartnerFaqForm({ open, editing, initialValues, saving, error, onClose, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const { control, handleSubmit, reset } = useForm<PartnerFaqFormValues>({
    defaultValues: initialValues,
    resolver: zodResolver(buildPartnerFaqSchema(t)),
    mode: 'onTouched',
  });

  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{editing ? 'Edit Partner FAQ' : 'New Partner FAQ'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <RhfTextField control={control} name="partner_topic" select label={t('admin.faqs.topic')}>
            {partnerFaqTopics(t).map((topic) => (
              <MenuItem key={topic.value} value={topic.value}>
                {topic.label}
              </MenuItem>
            ))}
          </RhfTextField>
          <RhfTextField control={control} name="question" label={t('admin.faqs.question')} required />
          <RhfTextField control={control} name="answer" label={t('admin.faqs.answer')} multiline minRows={4} required />
          <Stack direction="row" spacing={2} alignItems="center">
            <RhfTextField control={control} name="sort_order" label={t('admin.podPlans.sortOrder')} type="number" sx={{ width: 160 }} fullWidth={false} />
            <Controller
              control={control}
              name="is_active"
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={!!field.value} onChange={(event) => field.onChange(event.target.checked)} />}
                  label={t('admin.profile.active')}
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
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
