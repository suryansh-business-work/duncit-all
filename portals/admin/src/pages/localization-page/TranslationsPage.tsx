import { useCallback, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Chip, Snackbar, Stack } from '@mui/material';
import { BackHeader } from '@duncit/ui';
import { useDateFormat } from '@duncit/app-settings';
import TranslationDialog, { type TranslationSubmit } from './TranslationDialog';
import TranslationsHeader from './TranslationsHeader';
import TranslationGroupsTable from './TranslationGroupsTable';
import TranslationEntriesTable from './TranslationEntriesTable';
import {
  LOCALES,
  UPSERT_TRANSLATION,
  type LocaleRow,
  type TranslationGroupRow,
  type TranslationRow,
} from './queries';
import { useTranslation } from '@duncit/shell';

/**
 * Translations, two levels deep: the namespaces first, then one namespace's
 * entries. A flat table of every key in the platform was unreadable once the
 * catalogue passed a few hundred rows, and translators work a page at a time.
 */
export default function TranslationsPage() {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const { data: localeData } = useQuery<any>(LOCALES, { fetchPolicy: 'cache-and-network' });
  const [upsert] = useMutation<any>(UPSERT_TRANSLATION);

  /** The namespace being edited — null is the groups list. */
  const [group, setGroup] = useState<TranslationGroupRow | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TranslationRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [opError, setOpError] = useState<string | null>(null);
  // Only one of the two tables is mounted at a time, so a single ref always
  // points at the one on screen.
  const refetchRef = useRef<(() => void) | null>(null);

  const locales: LocaleRow[] = useMemo(
    () => (localeData?.locales ?? []).filter((l: LocaleRow) => l.is_active),
    [localeData],
  );

  // Bundled copy is English, so it seeds the default locale's column.
  const defaultLocale = useMemo(
    () => locales.find((l) => l.is_default)?.code ?? null,
    [locales],
  );

  const openRow = useCallback((row: TranslationRow) => {
    setOpError(null);
    setEditing(row);
    setOpen(true);
  }, []);

  const openAdd = useCallback(() => {
    setEditing(null);
    setOpError(null);
    setOpen(true);
  }, []);

  const onImported = useCallback((message: string) => {
    setToast(message);
    refetchRef.current?.();
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
      setOpError(e instanceof Error ? e.message : t('admin.localization.saveTranslationFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={2}>
      {group ? (
        <BackHeader
          onBack={() => setGroup(null)}
          backAriaLabel="Back to namespaces"
          backSize="medium"
          eyebrow={`Translations / ${group.surface}`}
          title={group.id}
          actions={<Chip size="small" label={`${group.key_count} keys`} />}
        />
      ) : (
        <TranslationsHeader
          defaultLocale={defaultLocale}
          canAdd={locales.length > 0}
          onImported={onImported}
          onError={setOpError}
          onAdd={openAdd}
        />
      )}

      {locales.length === 0 && (
        <Alert severity="warning">
          No active locales yet — add one under Localization → Locales first.
        </Alert>
      )}
      {opError && <Alert severity="error">{opError}</Alert>}

      {group ? (
        <TranslationEntriesTable
          surface={group.surface}
          page={group.page}
          locales={locales}
          formatDateTime={formatDateTime}
          onOpen={openRow}
          refetchRef={refetchRef}
        />
      ) : (
        <TranslationGroupsTable
          locales={locales}
          onOpen={setGroup}
          refetchRef={refetchRef}
        />
      )}

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
