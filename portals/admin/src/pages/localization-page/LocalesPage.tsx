import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Box, Snackbar, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import TranslateIcon from '@mui/icons-material/Translate';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import LocaleDialog, { type LocaleFormValues } from './LocaleDialog';
import LocalesTable from './LocalesTable';
import AutoTranslateDialog from './AutoTranslateDialog';
import {
  DELETE_LOCALE,
  LOCALES,
  LOCALE_COVERAGE,
  UPSERT_LOCALE,
  type LocaleCoverageRow,
  type LocaleRow,
} from './queries';

/** Locales — the languages/country locales the platform can render in. */
export default function LocalesPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<any>(LOCALES, { fetchPolicy: 'cache-and-network' });
  const { data: coverageData, refetch: refetchCoverage } = useQuery<any>(LOCALE_COVERAGE, {
    fetchPolicy: 'cache-and-network',
  });
  const [upsert] = useMutation<any>(UPSERT_LOCALE, { refetchQueries: ['Locales'] });
  const [remove] = useMutation<any>(DELETE_LOCALE, { refetchQueries: ['Locales'] });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LocaleRow | null>(null);
  const [autoTarget, setAutoTarget] = useState<LocaleRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [opError, setOpError] = useState<string | null>(null);

  const rows: LocaleRow[] = data?.locales ?? [];

  const coverage = useMemo(() => {
    const byCode: Record<string, LocaleCoverageRow> = {};
    for (const row of coverageData?.localeCoverage ?? []) byCode[row.locale] = row;
    return byCode;
  }, [coverageData]);

  const onRunFinished = useCallback(() => {
    refetchCoverage().catch(() => undefined);
  }, [refetchCoverage]);

  const submit = async (values: LocaleFormValues) => {
    setSaving(true);
    setOpError(null);
    try {
      const res = await upsert({ variables: { input: values } });
      const saved: LocaleRow | undefined = res.data?.upsertLocale;
      setToast(
        editing ? t('admin.localization.localeUpdated') : t('admin.localization.localeAdded'),
      );
      setOpen(false);
      // A language added here carries no text at all, and filling ~11,000 keys
      // by hand is why locales used to be added and then left unused — so the
      // offer to translate it comes with the language, not two clicks later.
      if (!editing && saved) setAutoTarget(saved);
    } catch (e) {
      setOpError(e instanceof Error ? e.message : t('admin.localization.saveLocaleFailed'));
    } finally {
      setSaving(false);
    }
  };

  const del = async (row: LocaleRow) => {
    setOpError(null);
    try {
      await remove({ variables: { code: row.code } });
      setToast(t('admin.localization.localeRemoved', { vars: { code: row.code } }));
      onRunFinished();
    } catch (e) {
      setOpError(e instanceof Error ? e.message : t('admin.localization.removeLocaleFailed'));
    }
  };

  const openAdd = () => {
    setEditing(null);
    setOpen(true);
  };

  const openEdit = useCallback((row: LocaleRow) => {
    setEditing(row);
    setOpen(true);
  }, []);

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <TranslateIcon color="primary" />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {t('admin.localization.localesTitle')}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('admin.localization.localesIntro')}
            </Typography>
          </Box>
        </Stack>
        <DuncitButton variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
          {t('admin.localization.addLocale')}
        </DuncitButton>
      </Stack>

      {error && <Alert severity="error">{error.message}</Alert>}
      {opError && <Alert severity="error">{opError}</Alert>}
      {!loading && rows.length === 0 && (
        <Alert severity="info">{t('admin.localization.localesEmpty')}</Alert>
      )}

      {rows.length > 0 && (
        <LocalesTable
          rows={rows}
          coverage={coverage}
          onEdit={openEdit}
          onDelete={del}
          onAutoTranslate={setAutoTarget}
        />
      )}

      <LocaleDialog
        open={open}
        editing={editing}
        saving={saving}
        onClose={() => setOpen(false)}
        onSubmit={submit}
      />
      <AutoTranslateDialog
        open={!!autoTarget}
        locale={autoTarget}
        onClose={() => setAutoTarget(null)}
        onFinished={onRunFinished}
      />
      <Snackbar
        open={!!toast}
        autoHideDuration={2500}
        onClose={() => setToast(null)}
        message={toast ?? ''}
      />
    </Stack>
  );
}
