import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import TranslateIcon from '@mui/icons-material/Translate';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { AiTranslateDialog } from '../../components/ai-translate-form';
import { LOCALES, LOCALE_COVERAGE, type LocaleCoverageRow, type LocaleRow } from '../../lib/queries';
import { useAiRunsSettled } from '../../lib/useAiRunsSettled';
import LocaleDialog from './LocaleDialog';
import LocalesTable from './LocalesTable';
import { useLocaleActions } from './useLocaleActions';

/** Locales — the languages/country locales the platform can render in. */
export default function LocalesPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<{ locales: LocaleRow[] }>(LOCALES, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: coverageData, refetch: refetchCoverage } = useQuery<{
    localeCoverage: LocaleCoverageRow[];
  }>(LOCALE_COVERAGE, { fetchPolicy: 'cache-and-network' });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LocaleRow | null>(null);
  /** The language the AI dialog opened for; null while it is closed. */
  const [aiTarget, setAiTarget] = useState<LocaleRow | null>(null);

  const refreshCoverage = useCallback(() => {
    refetchCoverage().catch(() => undefined);
  }, [refetchCoverage]);
  // A run finishing is exactly when the Translated column goes stale.
  useAiRunsSettled(refreshCoverage);

  const { submit, del, saving, opError } = useLocaleActions({
    editing,
    onSaved: () => setOpen(false),
    onRemoved: refreshCoverage,
  });

  const rows = useMemo(() => data?.locales ?? [], [data]);
  const targets = useMemo(() => rows.filter((row) => !row.is_default), [rows]);
  const preselect = useMemo(() => (aiTarget ? [aiTarget.code] : []), [aiTarget]);
  const coverage = useMemo(() => {
    const byCode: Record<string, LocaleCoverageRow> = {};
    for (const row of coverageData?.localeCoverage ?? []) byCode[row.locale] = row;
    return byCode;
  }, [coverageData]);

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
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <TranslateIcon color="primary" />
          <Box>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
              {t('localization.locales.title')}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('localization.locales.intro')}
            </Typography>
          </Box>
        </Stack>
        <DuncitButton variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
          {t('localization.locales.add')}
        </DuncitButton>
      </Stack>

      {error && <Alert severity="error">{error.message}</Alert>}
      {opError && <Alert severity="error">{opError}</Alert>}
      {!loading && rows.length === 0 && <Alert severity="info">{t('localization.locales.empty')}</Alert>}

      {rows.length > 0 && (
        <LocalesTable
          rows={rows}
          coverage={coverage}
          onEdit={openEdit}
          onDelete={del}
          onAiTranslate={setAiTarget}
        />
      )}

      <LocaleDialog
        open={open}
        editing={editing}
        saving={saving}
        onClose={() => setOpen(false)}
        onSubmit={submit}
      />
      {aiTarget && (
        <AiTranslateDialog targets={targets} preselect={preselect} onClose={() => setAiTarget(null)} />
      )}
    </Stack>
  );
}
