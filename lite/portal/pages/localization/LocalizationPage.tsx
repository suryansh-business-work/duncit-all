import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Box, Stack, Typography } from '@mui/material';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { PageHeader, QueryGuard } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { ALL_LITE_ENTRIES, usePortalT } from '../../../shared/i18n';
import {
  LITE_DELETE_LOCALE,
  LITE_IMPORT_TRANSLATION_KEYS,
  LITE_LOCALES,
  LITE_UPSERT_LOCALE,
  type LiteImportResult,
  type LiteLocale,
} from '../../graphql/localization';
import { useAction } from '../../hooks/useAction';
import { LocaleForm, toLocaleInput, type LocaleFormValues } from './locale';
import { LocalesPanel } from './LocalesPanel';
import { TranslationsTable } from './TranslationsTable';

/** The default language, or the first one, when nothing has been picked yet. */
const pickLocale = (locales: readonly LiteLocale[], code: string | null): LiteLocale | null =>
  locales.find((locale) => locale.code === code) ?? locales.find((locale) => locale.is_default) ?? locales[0] ?? null;

export function LocalizationPage() {
  const { t } = usePortalT();
  const confirm = useConfirm();
  const { data, loading, error, refetch } = useQuery<{ liteLocales: LiteLocale[] }>(LITE_LOCALES, { fetchPolicy: 'cache-and-network' });
  const locales = useMemo(() => data?.liteLocales ?? [], [data]);
  const reload = useCallback(() => {
    refetch().catch(() => undefined);
  }, [refetch]);
  const run = useAction(reload);
  const [upsertLocale, upsertState] = useMutation(LITE_UPSERT_LOCALE);
  const [deleteLocale] = useMutation(LITE_DELETE_LOCALE);
  const [importKeys, importState] = useMutation<{ liteImportTranslationKeys: LiteImportResult }>(LITE_IMPORT_TRANSLATION_KEYS);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [editing, setEditing] = useState<LiteLocale | null>(null);
  const [creating, setCreating] = useState(false);
  const selected = pickLocale(locales, selectedCode);

  const onDelete = async (locale: LiteLocale) => {
    const vars = { vars: { name: locale.english_label, label: locale.english_label } };
    const ok = await confirm({
      title: t('litePortal.common.deleteTitle', vars),
      message: t('litePortal.localization.localeDeleteMessage'),
      confirmLabel: t('lite.common.delete'),
      cancelLabel: t('lite.common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    await run(() => deleteLocale({ variables: { code: locale.code } }), t('litePortal.localization.localeDeleted', vars));
  };

  /** Seeds every shipped key against the default language; the count is the server's answer. */
  const onImport = async () => {
    try {
      const { data: imported } = await importKeys({ variables: { entries: ALL_LITE_ENTRIES() } });
      const result = imported?.liteImportTranslationKeys;
      notifySuccess(t('litePortal.localization.importDone', { vars: { created: result?.created ?? 0, skipped: result?.skipped ?? 0 } }));
      reload();
    } catch (err) {
      notifyError(parseApiError(err));
    }
  };

  const close = () => {
    setCreating(false);
    setEditing(null);
  };

  const onSubmit = async (values: LocaleFormValues) => {
    const ok = await run(() => upsertLocale({ variables: { input: toLocaleInput(values) } }), t('litePortal.localization.localeSaved', { vars: { label: values.english_label } }));
    if (ok) close();
  };

  return (
    <Stack spacing={2}>
      <PageHeader title={t('litePortal.localization.title')} subtitle={t('litePortal.localization.subtitle')} />
      <QueryGuard loading={loading && !data} error={error} loadingLabel={t('lite.common.loading')}>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '340px minmax(0, 1fr)' }, alignItems: 'start' }}>
          <LocalesPanel
            locales={locales}
            selectedCode={selected?.code ?? null}
            importing={importState.loading}
            onSelect={(locale) => setSelectedCode(locale.code)}
            onAdd={() => setCreating(true)}
            onEdit={setEditing}
            onDelete={onDelete}
            onImport={onImport}
          />
          <Stack spacing={1.5} sx={{ minWidth: 0 }}>
            {selected ? (
              <>
                <Typography variant="h6" component="h2">
                  {t('litePortal.localization.translations', { vars: { label: selected.english_label } })}
                </Typography>
                <TranslationsTable key={selected.code} locale={selected} />
              </>
            ) : (
              <Alert severity="info">{t('litePortal.localization.selectLocale')}</Alert>
            )}
          </Stack>
        </Box>
      </QueryGuard>
      <LocaleForm open={creating || Boolean(editing)} initial={editing} busy={upsertState.loading} onClose={close} onSubmit={onSubmit} />
    </Stack>
  );
}
