import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
} from '@mui/material';
import type { LocaleRow } from './queries';
import { useTranslation } from '@duncit/shell';

/** BCP-47-ish: a language, optionally a region — e.g. en, en-IN, zh-Hant-HK. */
const localeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, 'Enter a locale code')
    .regex(/^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/, 'Use a BCP-47 tag such as en-IN or hi-IN'),
  label: z.string().trim().min(1, 'Enter the language name in its own script'),
  english_label: z.string().trim().optional(),
  is_rtl: z.boolean(),
  is_active: z.boolean(),
  is_default: z.boolean(),
  sort_order: z.coerce.number().int().min(0),
});

export type LocaleFormValues = z.infer<typeof localeSchema>;

const blank: LocaleFormValues = {
  code: '',
  label: '',
  english_label: '',
  is_rtl: false,
  is_active: true,
  is_default: false,
  sort_order: 0,
};

interface Props {
  open: boolean;
  editing: LocaleRow | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: LocaleFormValues) => void;
}

export default function LocaleDialog({ open, editing, saving, onClose, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LocaleFormValues>({ resolver: zodResolver(localeSchema), defaultValues: blank });

  useEffect(() => {
    if (!open) return;
    reset(
      editing
        ? {
            code: editing.code,
            label: editing.label,
            english_label: editing.english_label,
            is_rtl: editing.is_rtl,
            is_active: editing.is_active,
            is_default: editing.is_default,
            sort_order: editing.sort_order,
          }
        : blank,
    );
  }, [open, editing, reset]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{editing ? `Edit ${editing.code}` : 'Add locale'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label={t('admin.localization.localeCode')}
            placeholder="hi-IN"
            // The code is the stable id stored on every user's profile, so it
            // cannot be edited once created.
            disabled={!!editing}
            error={!!errors.code}
            helperText={errors.code?.message ?? 'BCP-47 tag, e.g. en-IN, hi-IN, ar-AE'}
            fullWidth
            {...register('code')}
          />
          <TextField
            label={t('admin.localization.languageName')}
            placeholder="हिन्दी"
            error={!!errors.label}
            helperText={errors.label?.message ?? "Shown in the switcher, in the language's own script"}
            fullWidth
            {...register('label')}
          />
          <TextField
            label={t('admin.localization.englishName')}
            placeholder={t('admin.localization.englishNamePlaceholder')}
            error={!!errors.english_label}
            helperText={errors.english_label?.message ?? 'Shown in admin lists'}
            fullWidth
            {...register('english_label')}
          />
          <TextField
            label={t('admin.podPlans.sortOrder')}
            type="number"
            error={!!errors.sort_order}
            helperText={errors.sort_order?.message ?? 'Order in the language switcher'}
            fullWidth
            {...register('sort_order')}
          />
          <FormControlLabel
            control={
              <Switch
                checked={watch('is_active')}
                onChange={(_, v) => setValue('is_active', v)}
              />
            }
            label={t('admin.localization.activeHint')}
          />
          <FormControlLabel
            control={
              <Switch checked={watch('is_rtl')} onChange={(_, v) => setValue('is_rtl', v)} />
            }
            label={t('admin.localization.rtl')}
          />
          <FormControlLabel
            control={
              <Switch
                checked={watch('is_default')}
                onChange={(_, v) => setValue('is_default', v)}
              />
            }
            label={t('admin.localization.defaultHint')}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
