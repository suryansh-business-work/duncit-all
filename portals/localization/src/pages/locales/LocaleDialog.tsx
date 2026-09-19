import { useEffect, useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import type { LocaleOption } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import LocalePicker from './LocalePicker';
import LocaleFlagSwitches from './LocaleFlagSwitches';
import type { LocaleRow } from '../../lib/queries';

type Translate = ReturnType<typeof useTranslation>['t'];

/** BCP-47-ish: a language, optionally a region — e.g. en, en-IN, zh-Hant-HK. */
const localeSchema = (t: Translate) =>
  z.object({
    code: z
      .string()
      .trim()
      .min(2, t('localization.locales.codeRequired'))
      .regex(/^[a-zA-Z]{2,3}(-[a-zA-Z\d]{2,8})*$/, t('localization.locales.codeFormat')),
    label: z.string().trim().min(1, t('localization.locales.labelRequired')),
    english_label: z.string().trim().optional(),
    is_rtl: z.boolean(),
    is_active: z.boolean(),
    is_default: z.boolean(),
    sort_order: z.coerce.number().int().min(0),
    /** Add only: start an AI translation of the whole catalogue once it is saved. */
    ai_translate: z.boolean(),
  });

export type LocaleFormValues = z.infer<ReturnType<typeof localeSchema>>;

const blank: LocaleFormValues = {
  code: '',
  label: '',
  english_label: '',
  is_rtl: false,
  is_active: true,
  is_default: false,
  sort_order: 0,
  ai_translate: true,
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
  const schema = useMemo(() => localeSchema(t), [t]);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LocaleFormValues, any, LocaleFormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<LocaleFormValues, any, LocaleFormValues>,
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
            ai_translate: false,
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
  // A new default IS the source, so there is nothing to translate it from.
  const aiBlocked = watch('is_default');

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {editing
          ? t('localization.locales.edit', { vars: { code: editing.code } })
          : t('localization.locales.add')}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {isDefault && <Alert severity="info">{t('localization.locales.defaultLocked')}</Alert>}
          {editing ? (
            <TextField
              label={t('localization.locales.localeCode')}
              // The code is the stable id stored on every user's profile, so it
              // cannot be edited once created.
              disabled
              value={editing.code}
              helperText={t('localization.locales.localeCodeFixed')}
              fullWidth
            />
          ) : (
            <LocalePicker value={watch('code')} error={errors.code?.message} onPick={applyPick} />
          )}
          <TextField
            label={t('localization.locales.languageName')}
            placeholder={t('localization.locales.languageNamePlaceholder')}
            error={!!errors.label}
            helperText={errors.label?.message ?? t('localization.locales.languageNameHint')}
            fullWidth
            slotProps={{ inputLabel: { shrink: !!watch('label') } }}
            {...register('label')}
          />
          <TextField
            label={t('localization.locales.englishName')}
            placeholder={t('localization.locales.englishNamePlaceholder')}
            // Optional free text: the schema never rejects it, so it has no error state.
            helperText={t('localization.locales.englishNameHint')}
            fullWidth
            slotProps={{ inputLabel: { shrink: !!watch('english_label') } }}
            {...register('english_label')}
          />
          <TextField
            label={t('localization.locales.sortOrder')}
            type="number"
            error={!!errors.sort_order}
            helperText={errors.sort_order?.message ?? t('localization.locales.sortOrderHint')}
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
          {!editing && (
            <Stack spacing={0.25}>
              <FormControlLabel
                control={
                  <Switch
                    checked={watch('ai_translate') && !aiBlocked}
                    disabled={aiBlocked}
                    onChange={(_, value) => setValue('ai_translate', value)}
                    data-testid="locale-dialog-ai-translate"
                  />
                }
                label={t('localization.locales.aiOnAdd')}
              />
              <Typography variant="caption" sx={{ color: 'text.secondary', pl: 6 }}>
                {aiBlocked ? t('localization.locales.aiOnAddDefault') : t('localization.locales.aiOnAddHint')}
              </Typography>
            </Stack>
          )}
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
