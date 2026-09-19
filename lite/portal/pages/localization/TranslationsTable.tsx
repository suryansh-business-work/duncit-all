import { useCallback, useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { useConfirm } from '@duncit/dialogs';
import { actionsColumn, dateColumn, DuncitTable, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { usePortalT } from '../../../shared/i18n';
import { LITE_DELETE_TRANSLATION, LITE_SET_TRANSLATIONS, LITE_TRANSLATIONS_TABLE, type LiteLocale, type LiteTranslationRow } from '../../graphql/localization';
import { useAction } from '../../hooks/useAction';
import { TranslationForm, type TranslationFormValues } from './translation';

interface Props {
  locale: LiteLocale;
}

const rowId = (row: LiteTranslationRow) => row.id;

const renderKey = (row: LiteTranslationRow) => (
  <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
    {row.key}
  </Typography>
);

/** The server-paged translations of one language, with add, edit and delete. */
export function TranslationsTable({ locale }: Readonly<Props>) {
  const { t } = usePortalT();
  const confirm = useConfirm();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const reload = useCallback(() => refetchRef.current?.(), []);
  const run = useAction(reload);
  const fetchRows = useApolloTableFetch<LiteTranslationRow>(client, LITE_TRANSLATIONS_TABLE, 'liteTranslationsTable', { extraVariables: { locale: locale.code } }, [locale.code]);
  const [setTranslations, setState] = useMutation(LITE_SET_TRANSLATIONS);
  const [deleteTranslation] = useMutation(LITE_DELETE_TRANSLATION);
  const [editing, setEditing] = useState<LiteTranslationRow | null>(null);
  const [creating, setCreating] = useState(false);

  const onDelete = useCallback(
    async (row: LiteTranslationRow) => {
      const ok = await confirm({
        title: t('litePortal.common.deleteTitle', { vars: { name: row.key } }),
        message: t('litePortal.localization.translationDeleteMessage'),
        confirmLabel: t('lite.common.delete'),
        cancelLabel: t('lite.common.cancel'),
        destructive: true,
      });
      if (!ok) return;
      await run(() => deleteTranslation({ variables: { id: row.id } }), t('litePortal.localization.translationDeleted'));
    },
    [confirm, deleteTranslation, run, t],
  );

  const columns = useMemo<DuncitColumn<LiteTranslationRow>[]>(
    () => [
      { field: 'key', headerName: t('litePortal.localization.colKey'), type: 'text', flex: 1, minWidth: 260, cellRenderer: renderKey },
      { field: 'value', headerName: t('litePortal.localization.colValue'), type: 'text', flex: 2, minWidth: 260, filterable: false },
      dateColumn({ field: 'updated_at', headerName: t('litePortal.localization.colUpdated'), hide: false, width: 130, filterable: false }),
      actionsColumn({
        headerName: t('litePortal.common.actions'),
        onEdit: setEditing,
        onDelete,
        edit: { title: (row) => t('litePortal.common.edit', { vars: { name: row.key } }) },
        delete: { title: (row) => t('litePortal.common.delete', { vars: { name: row.key } }) },
      }),
    ],
    [t, onDelete],
  );

  const close = () => {
    setCreating(false);
    setEditing(null);
  };

  const onSubmit = async (values: TranslationFormValues) => {
    const ok = await run(() => setTranslations({ variables: { locale: locale.code, entries: [values] } }), t('litePortal.localization.translationSaved'));
    if (ok) close();
  };

  return (
    <>
      <DuncitTable<LiteTranslationRow>
        tableId="lite-translations"
        ariaLabel={t('litePortal.localization.translations', { vars: { label: locale.english_label } })}
        columns={columns}
        fetchRows={fetchRows}
        getRowId={rowId}
        emptyText={t('litePortal.localization.empty')}
        searchPlaceholder={t('litePortal.localization.search')}
        defaultSort={{ field: 'key', dir: 'asc' }}
        refetchRef={refetchRef}
        toolbarActions={
          <DuncitButton size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)} data-testid="translation-add">
            {t('litePortal.localization.addTranslation')}
          </DuncitButton>
        }
      />
      <TranslationForm open={creating || Boolean(editing)} initial={editing} busy={setState.loading} onClose={close} onSubmit={onSubmit} />
    </>
  );
}
