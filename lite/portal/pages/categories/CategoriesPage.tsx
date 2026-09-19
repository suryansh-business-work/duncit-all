import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { useConfirm } from '@duncit/dialogs';
import { DuncitTable } from '@duncit/table';
import { PageHeader, QueryGuard } from '@duncit/ui';
import { usePortalT } from '../../../shared/i18n';
import { useClientTable } from '../../components/useClientTable';
import { LITE_ADMIN_CATEGORIES, LITE_DELETE_CATEGORY, LITE_UPSERT_CATEGORY, type LiteAdminCategory } from '../../graphql/catalogue';
import { useAction } from '../../hooks/useAction';
import { CategoryForm, toCategoryInput, type CategoryFormValues } from './category';
import { buildCategoryColumns, categoryRowId, categorySearchText } from './columns';

export function CategoriesPage() {
  const { t } = usePortalT();
  const confirm = useConfirm();
  const { data, loading, error, refetch } = useQuery<{ liteCategories: LiteAdminCategory[] }>(LITE_ADMIN_CATEGORIES, { fetchPolicy: 'cache-and-network' });
  const rows = useMemo(() => data?.liteCategories ?? [], [data]);
  const reload = useCallback(() => {
    refetch().catch(() => undefined);
  }, [refetch]);
  const run = useAction(reload);
  const [upsert, upsertState] = useMutation(LITE_UPSERT_CATEGORY);
  const [remove] = useMutation(LITE_DELETE_CATEGORY);
  const [editing, setEditing] = useState<LiteAdminCategory | null>(null);
  const [creating, setCreating] = useState(false);

  const onDelete = useCallback(
    async (row: LiteAdminCategory) => {
      const vars = { vars: { name: row.name } };
      const ok = await confirm({
        title: t('litePortal.common.deleteTitle', vars),
        message: t('litePortal.categories.deleteMessage'),
        confirmLabel: t('lite.common.delete'),
        cancelLabel: t('lite.common.cancel'),
        destructive: true,
      });
      if (!ok) return;
      await run(() => remove({ variables: { id: row.id } }), t('litePortal.categories.deleted', vars));
    },
    [confirm, remove, run, t],
  );

  const columns = useMemo(() => buildCategoryColumns(t, { onEdit: setEditing, onDelete }), [t, onDelete]);
  const { fetchRows, refetchRef } = useClientTable(rows, categorySearchText, columns);

  const close = () => {
    setCreating(false);
    setEditing(null);
  };

  const onSubmit = async (values: CategoryFormValues) => {
    const ok = await run(
      () => upsert({ variables: { id: editing?.id ?? null, input: toCategoryInput(values) } }),
      t('litePortal.categories.saved', { vars: { name: values.name } }),
    );
    if (ok) close();
  };

  return (
    <Stack spacing={2}>
      <PageHeader title={t('litePortal.categories.title')} subtitle={t('litePortal.categories.subtitle')} />
      <QueryGuard loading={loading && !data} error={error} loadingLabel={t('lite.common.loading')}>
        <DuncitTable<LiteAdminCategory>
          tableId="lite-categories"
          ariaLabel={t('litePortal.categories.title')}
          columns={columns}
          fetchRows={fetchRows}
          getRowId={categoryRowId}
          emptyText={t('litePortal.categories.empty')}
          searchPlaceholder={t('litePortal.categories.search')}
          defaultSort={{ field: 'sort_order', dir: 'asc' }}
          refetchRef={refetchRef}
          toolbarActions={
            <DuncitButton size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)} data-testid="category-add">
              {t('litePortal.categories.add')}
            </DuncitButton>
          }
        />
      </QueryGuard>
      <CategoryForm open={creating || Boolean(editing)} initial={editing} busy={upsertState.loading} onClose={close} onSubmit={onSubmit} />
    </Stack>
  );
}
