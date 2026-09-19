import { useEffect, useState } from 'react';
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
import { useTranslation } from '@duncit/shell';
import { valueFor, type LocaleRow, type TranslationRow } from '../../lib/queries';

export interface TranslationSubmit {
  key: string;
  description: string;
  values: { locale: string; value: string }[];
}

interface Props {
  open: boolean;
  editing: TranslationRow | null;
  locales: LocaleRow[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: TranslationSubmit) => void;
}

/** Edit one key across every language. Keys use dot-paths namespaced
 * portal-wise then page-wise, e.g. mweb.shop.emptyState. */
export default function TranslationDialog({
  open,
  editing,
  locales,
  saving,
  onClose,
  onSubmit,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setKey(editing?.key ?? '');
    setDescription(editing?.description ?? '');
    const next: Record<string, string> = {};
    for (const locale of locales) {
      next[locale.code] = editing ? valueFor(editing, locale.code) : '';
    }
    setValues(next);
  }, [open, editing, locales]);

  const trimmedKey = key.trim();
  const keyLooksNamespaced = trimmedKey.split('.').filter(Boolean).length >= 2;
  const keyInvalid = !!trimmedKey && !keyLooksNamespaced;

  // By the time Save can be pressed, the open effect has seeded a value for every locale.
  const submit = () =>
    onSubmit({
      key: trimmedKey,
      description: description.trim(),
      values: locales.map((locale) => ({
        locale: locale.code,
        value: values[locale.code],
      })),
    });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        {editing ? t('localization.translations.edit') : t('localization.translations.add')}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label={t('localization.translations.key')}
            placeholder={t('localization.translations.keyPlaceholder')}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            // The key is the id every surface looks up, so it is fixed once set.
            disabled={!!editing}
            error={keyInvalid}
            helperText={
              keyInvalid ? t('localization.translations.keyInvalid') : t('localization.translations.keyHint')
            }
            fullWidth
          />
          <TextField
            label={t('shell.common.description')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            helperText={t('localization.translations.noteHint')}
            fullWidth
          />

          {locales.length === 0 && (
            <Alert severity="warning">{t('localization.translations.noLocale')}</Alert>
          )}

          {locales.map((locale) => (
            <TextField
              key={locale.code}
              label={
                locale.is_default
                  ? t('localization.translations.defaultValueLabel', {
                      vars: { language: locale.label, code: locale.code },
                    })
                  : t('localization.translations.valueLabel', {
                      vars: { language: locale.label, code: locale.code },
                    })
              }
              value={values[locale.code] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [locale.code]: e.target.value }))}
              multiline
              minRows={1}
              fullWidth
              helperText={
                locale.is_default
                  ? t('localization.translations.sourceHint')
                  : t('localization.translations.fallbackHint')
              }
            />
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{t('shell.common.cancel')}</DuncitButton>
        <DuncitButton
          variant="contained"
          onClick={submit}
          disabled={saving || !trimmedKey || !keyLooksNamespaced || locales.length === 0}
        >
          {saving ? t('shell.common.saving') : t('shell.common.save')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
