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
import { LITE_ADMIN_CITIES, LITE_DELETE_CITY, LITE_UPSERT_CITY, type LiteAdminCity } from '../../graphql/catalogue';
import { useAction } from '../../hooks/useAction';
import { CityForm, toCityInput, type CityFormValues } from './city';
import { buildCityColumns, cityRowId, citySearchText } from './columns';

export function CitiesPage() {
  const { t } = usePortalT();
  const confirm = useConfirm();
  const { data, loading, error, refetch } = useQuery<{ liteCities: LiteAdminCity[] }>(LITE_ADMIN_CITIES, { fetchPolicy: 'cache-and-network' });
  const rows = useMemo(() => data?.liteCities ?? [], [data]);
  const reload = useCallback(() => {
    refetch().catch(() => undefined);
  }, [refetch]);
  const run = useAction(reload);
  const [upsert, upsertState] = useMutation(LITE_UPSERT_CITY);
  const [remove] = useMutation(LITE_DELETE_CITY);
  const [editing, setEditing] = useState<LiteAdminCity | null>(null);
  const [creating, setCreating] = useState(false);

  const onDelete = useCallback(
    async (row: LiteAdminCity) => {
      const vars = { vars: { name: row.name } };
      const ok = await confirm({
        title: t('litePortal.common.deleteTitle', vars),
        message: t('litePortal.cities.deleteMessage'),
        confirmLabel: t('lite.common.delete'),
        cancelLabel: t('lite.common.cancel'),
        destructive: true,
      });
      if (!ok) return;
      await run(() => remove({ variables: { id: row.id } }), t('litePortal.cities.deleted', vars));
    },
    [confirm, remove, run, t],
  );

  const columns = useMemo(() => buildCityColumns(t, { onEdit: setEditing, onDelete }), [t, onDelete]);
  const { fetchRows, refetchRef } = useClientTable(rows, citySearchText, columns);

  const close = () => {
    setCreating(false);
    setEditing(null);
  };

  const onSubmit = async (values: CityFormValues) => {
    const ok = await run(
      () => upsert({ variables: { id: editing?.id ?? null, input: toCityInput(values) } }),
      t('litePortal.cities.saved', { vars: { name: values.name } }),
    );
    if (ok) close();
  };

  return (
    <Stack spacing={2}>
      <PageHeader title={t('litePortal.cities.title')} subtitle={t('litePortal.cities.subtitle')} />
      <QueryGuard loading={loading && !data} error={error} loadingLabel={t('lite.common.loading')}>
        <DuncitTable<LiteAdminCity>
          tableId="lite-cities"
          ariaLabel={t('litePortal.cities.title')}
          columns={columns}
          fetchRows={fetchRows}
          getRowId={cityRowId}
          emptyText={t('litePortal.cities.empty')}
          searchPlaceholder={t('litePortal.cities.search')}
          defaultSort={{ field: 'sort_order', dir: 'asc' }}
          refetchRef={refetchRef}
          toolbarActions={
            <DuncitButton size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)} data-testid="city-add">
              {t('litePortal.cities.add')}
            </DuncitButton>
          }
        />
      </QueryGuard>
      <CityForm open={creating || Boolean(editing)} initial={editing} busy={upsertState.loading} onClose={close} onSubmit={onSubmit} />
    </Stack>
  );
}
