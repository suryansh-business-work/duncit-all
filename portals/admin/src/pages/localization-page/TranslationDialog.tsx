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
import { valueFor, type LocaleRow, type TranslationRow } from './queries';
import { useTranslation } from '@duncit/shell';

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

  const submit = () =>
    onSubmit({
      key: trimmedKey,
      description: description.trim(),
      values: locales.map((locale) => ({
        locale: locale.code,
        value: values[locale.code] ?? '',
      })),
    });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{editing ? 'Edit translation' : 'Add translation'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label={t('admin.podPlans.key')}
            placeholder="mweb.shop.emptyState"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            // The key is the id every surface looks up, so it is fixed once set.
            disabled={!!editing}
            error={!!trimmedKey && !keyLooksNamespaced}
            helperText={
              trimmedKey && !keyLooksNamespaced
                ? 'Use at least portal.page.name, e.g. mweb.shop.emptyState'
                : 'Namespaced portal-wise then page-wise — this drives the Portal/Page filters'
            }
            fullWidth
          />
          <TextField
            label={t('shell.common.description')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            helperText={t('admin.localization.noteHint')}
            fullWidth
          />

          {locales.length === 0 && (
            <Alert severity="warning">{t('admin.localization.noLocale')}</Alert>
          )}

          {locales.map((locale) => (
            <TextField
              key={locale.code}
              label={`${locale.label} (${locale.code})${locale.is_default ? ' — default' : ''}`}
              value={values[locale.code] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [locale.code]: e.target.value }))}
              multiline
              minRows={1}
              fullWidth
              helperText={
                locale.is_default
                  ? 'Source text — every untranslated locale falls back to this'
                  : 'Leave blank to fall back to the default language'
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
          {saving ? 'Saving…' : 'Save'}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
