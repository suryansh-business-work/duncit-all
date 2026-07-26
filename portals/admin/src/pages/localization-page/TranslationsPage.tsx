import { useCallback, useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Button, Snackbar, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SpellcheckIcon from '@mui/icons-material/Spellcheck';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import { useDateFormat } from '@duncit/app-settings';
import TranslationDialog, { type TranslationSubmit } from './TranslationDialog';
import { getTranslationColumns } from './translation-columns';
import {
  LOCALES,
  TRANSLATIONS_TABLE,
  UPSERT_TRANSLATION,
  type LocaleRow,
  type TranslationRow,
} from './queries';

const getRowId = (row: TranslationRow) => row.id;

/** Translations — every key with its text in each language. */
export default function TranslationsPage() {
  const client = useApolloClient();
  const { formatDateTime } = useDateFormat();
  const { data: localeData } = useQuery(LOCALES, { fetchPolicy: 'cache-and-network' });
  const [upsert] = useMutation(UPSERT_TRANSLATION);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TranslationRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [opError, setOpError] = useState<string | null>(null);
  const refetchRef = useRef<(() => void) | null>(null);

  const locales: LocaleRow[] = useMemo(
    () => (localeData?.locales ?? []).filter((l: LocaleRow) => l.is_active),
    [localeData],
  );

  const fetchRows = useApolloTableFetch<TranslationRow>(
    client,
    TRANSLATIONS_TABLE,
    'translationsTable',
  );

  const columns = useMemo(
    () => getTranslationColumns({ locales, formatDateTime }),
    [locales, formatDateTime],
  );

  const openRow = useCallback((row: TranslationRow) => {
    setOpError(null);
    setEditing(row);
    setOpen(true);
  }, []);

  const submit = async (values: TranslationSubmit) => {
    setSaving(true);
    setOpError(null);
    try {
      await upsert({ variables: { input: values } });
      setToast(editing ? 'Translation updated' : 'Translation added');
      setOpen(false);
      refetchRef.current?.();
    } catch (e) {
      setOpError(e instanceof Error ? e.message : 'Failed to save translation');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <SpellcheckIcon color="primary" />
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Translations
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Every user-facing string, namespaced portal-wise and page-wise. Untranslated
              entries fall back to the default language, then to each app&apos;s bundled copy.
            </Typography>
          </Box>
        </Stack>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          disabled={locales.length === 0}
          onClick={() => {
            setEditing(null);
            setOpError(null);
            setOpen(true);
          }}
        >
          Add translation
        </Button>
      </Stack>

      {locales.length === 0 && (
        <Alert severity="warning">
          No active locales yet — add one under Localization → Locales first.
        </Alert>
      )}
      {opError && <Alert severity="error">{opError}</Alert>}

      <DuncitTable<TranslationRow>
        tableId="admin-translations"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        onRowClick={openRow}
        emptyText="No translations match the current filters."
        defaultSort={{ field: 'key', dir: 'asc' }}
        searchPlaceholder="Search key or description"
        refetchRef={refetchRef}
      />

      <TranslationDialog
        open={open}
        editing={editing}
        locales={locales}
        saving={saving}
        onClose={() => setOpen(false)}
        onSubmit={submit}
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
