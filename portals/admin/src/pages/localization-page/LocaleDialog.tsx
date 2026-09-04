import { useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import type { LocaleOption } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import LocalePicker from './LocalePicker';
import LocaleFlagSwitches from './LocaleFlagSwitches';
import type { LocaleRow } from './queries';

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
  } = useForm<LocaleFormValues, any, LocaleFormValues>({
    resolver: zodResolver(localeSchema) as unknown as Resolver<LocaleFormValues, any, LocaleFormValues>,
    defaultValues: blank,
  });

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

  /** A picked (or typed) language fills the tag, both names and the direction. */
  const applyPick = (option: LocaleOption) => {
    setValue('code', option.code, { shouldValidate: true });
    setValue('label', option.label);
    setValue('english_label', option.english_label);
    setValue('is_rtl', option.is_rtl);
  };

  // The platform's source language: everything else falls back to it, so it
  // must stay the default and stay switched on. Promote another language to
  // move it — there is no state in which no language is the default.
  const isDefault = editing?.is_default === true;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {editing
          ? t('admin.localization.editLocale', { vars: { code: editing.code } })
          : t('admin.localization.addLocale')}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {isDefault && <Alert severity="info">{t('admin.localization.defaultLocked')}</Alert>}
          {editing ? (
            <TextField
              label={t('admin.localization.localeCode')}
              // The code is the stable id stored on every user's profile, so it
              // cannot be edited once created.
              disabled
              value={editing.code}
              helperText={t('admin.localization.localeCodeFixed')}
              fullWidth
            />
          ) : (
            <LocalePicker
              value={watch('code')}
              error={errors.code?.message}
              onPick={applyPick}
            />
          )}
          <TextField
            label={t('admin.localization.languageName')}
            placeholder="हिन्दी"
            error={!!errors.label}
            helperText={errors.label?.message ?? t('admin.localization.languageNameHint')}
            fullWidth
            slotProps={{ inputLabel: { shrink: !!watch('label') } }}
            {...register('label')}
          />
          <TextField
            label={t('admin.localization.englishName')}
            placeholder={t('admin.localization.englishNamePlaceholder')}
            error={!!errors.english_label}
            helperText={errors.english_label?.message ?? t('admin.localization.englishNameHint')}
            fullWidth
            slotProps={{ inputLabel: { shrink: !!watch('english_label') } }}
            {...register('english_label')}
          />
          <TextField
            label={t('admin.podPlans.sortOrder')}
            type="number"
            error={!!errors.sort_order}
            helperText={errors.sort_order?.message ?? t('admin.localization.sortOrderHint')}
            fullWidth
            {...register('sort_order')}
          />
          <LocaleFlagSwitches
            isActive={watch('is_active')}
            isRtl={watch('is_rtl')}
            isDefault={watch('is_default')}
            lockedAsDefault={isDefault}
            onChange={(field, value) => setValue(field, value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{t('shell.common.cancel')}</DuncitButton>
        <DuncitButton variant="contained" onClick={handleSubmit(onSubmit)} disabled={saving}>
          {saving ? t('shell.common.saving') : t('shell.common.save')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
