import { useCallback, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Chip, Stack } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { BackHeader } from '@duncit/ui';
import { DuncitButton } from '@duncit/buttons';
import { notifySuccess } from '@duncit/dialogs';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import { AiTranslateDialog, type AiTranslateNamespace } from '../../components/ai-translate-form';
import { LOCALES, UPSERT_TRANSLATION, type LocaleRow, type TranslationGroupRow, type TranslationRow } from '../../lib/queries';
import { useAiRunsSettled } from '../../lib/useAiRunsSettled';
import TranslationDialog, { type TranslationSubmit } from './TranslationDialog';
import TranslationsHeader from './TranslationsHeader';
import TranslationGroupsTable from './TranslationGroupsTable';
import TranslationEntriesTable from './TranslationEntriesTable';

/** Which AI run the dialog is set up for: the whole catalogue, or one namespace. */
interface AiRequest {
  namespace: AiTranslateNamespace | null;
}

/**
 * Translations, two levels deep: the namespaces first, then one namespace's
 * entries. A flat table of every key in the platform was unreadable once the
 * catalogue passed a few hundred rows, and translators work a page at a time.
 */
export default function TranslationsPage() {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const { data: localeData } = useQuery<{ locales: LocaleRow[] }>(LOCALES, { fetchPolicy: 'cache-and-network' });
  const [upsert] = useMutation(UPSERT_TRANSLATION);

  /** The namespace being edited — null is the groups list. */
  const [group, setGroup] = useState<TranslationGroupRow | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TranslationRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);
  const [aiRequest, setAiRequest] = useState<AiRequest | null>(null);
  // Only one of the two tables is mounted at a time, so a single ref always
  // points at the one on screen.
  const refetchRef = useRef<(() => void) | null>(null);
  const refetchTable = useCallback(() => refetchRef.current?.(), []);
  // A finished run changes the counts and the text on screen.
  useAiRunsSettled(refetchTable);

  const locales = useMemo(() => (localeData?.locales ?? []).filter((l) => l.is_active), [localeData]);
  const targets = useMemo(() => locales.filter((l) => !l.is_default), [locales]);

  // Bundled copy is English, so it seeds the default locale's column.
  const defaultLocale = useMemo(() => locales.find((l) => l.is_default)?.code ?? null, [locales]);

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

  const onImported = useCallback(
    (message: string) => {
      notifySuccess(message);
      refetchTable();
    },
    [refetchTable],
  );

  const submit = async (values: TranslationSubmit) => {
    setSaving(true);
    setOpError(null);
    try {
      await upsert({ variables: { input: values } });
      notifySuccess(editing ? t('localization.translations.updated') : t('localization.translations.added'));
      setOpen(false);
      refetchTable();
    } catch (e) {
      // A rejected mutation is always an Error — Apollo wraps anything else.
      setOpError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const groupActions = group && (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <Chip size="small" label={t('localization.translations.keyCount', { count: group.key_count })} />
      <DuncitButton
        size="small"
        variant="outlined"
        startIcon={<AutoAwesomeIcon />}
        disabled={targets.length === 0}
        onClick={() => setAiRequest({ namespace: { surface: group.surface, page: group.page } })}
        data-testid="translations-ai-translate-page"
      >
        {t('localization.translations.aiTranslatePage')}
      </DuncitButton>
    </Stack>
  );

  return (
    <Stack spacing={2}>
      {group ? (
        <BackHeader
          onBack={() => setGroup(null)}
          backAriaLabel={t('localization.translations.backToNamespaces')}
          backSize="medium"
          eyebrow={t('localization.translations.eyebrow', { vars: { surface: group.surface } })}
          title={group.id}
          actions={groupActions}
        />
      ) : (
        <TranslationsHeader
          defaultLocale={defaultLocale}
          canAdd={locales.length > 0}
          canTranslate={targets.length > 0}
          onImported={onImported}
          onError={setOpError}
          onAdd={openAdd}
          onAiTranslate={() => setAiRequest({ namespace: null })}
        />
      )}

      {locales.length === 0 && <Alert severity="warning">{t('localization.translations.noActiveLocale')}</Alert>}
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
        <TranslationGroupsTable locales={locales} onOpen={setGroup} refetchRef={refetchRef} />
      )}

      <TranslationDialog
        open={open}
        editing={editing}
        locales={locales}
        saving={saving}
        onClose={() => setOpen(false)}
        onSubmit={submit}
      />
      {aiRequest && (
        <AiTranslateDialog targets={targets} namespace={aiRequest.namespace} onClose={() => setAiRequest(null)} />
      )}
    </Stack>
  );
}
