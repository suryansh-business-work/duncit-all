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
import { LITE_ADMIN_POLICIES, LITE_DELETE_POLICY, LITE_UPSERT_POLICY, type LiteAdminPolicy } from '../../graphql/policies';
import { useAction } from '../../hooks/useAction';
import { buildPolicyColumns, policyRowId, policySearchText } from './columns';
import { PolicyForm, toPolicyInput, type PolicyFormValues } from './policy';

/** Console → Policies: privacy, terms of use, data policy and any other page; the live ones are linked from the site footer. */
export function PoliciesPage() {
  const { t } = usePortalT();
  const confirm = useConfirm();
  const { data, loading, error, refetch } = useQuery<{ liteAdminPolicies: LiteAdminPolicy[] }>(LITE_ADMIN_POLICIES, { fetchPolicy: 'cache-and-network' });
  const rows = useMemo(() => data?.liteAdminPolicies ?? [], [data]);
  const reload = useCallback(() => {
    refetch().catch(() => undefined);
  }, [refetch]);
  const run = useAction(reload);
  const [upsert, upsertState] = useMutation(LITE_UPSERT_POLICY);
  const [remove] = useMutation(LITE_DELETE_POLICY);
  const [editing, setEditing] = useState<LiteAdminPolicy | null>(null);
  const [creating, setCreating] = useState(false);

  const onDelete = useCallback(
    async (row: LiteAdminPolicy) => {
      const vars = { vars: { name: row.title } };
      const ok = await confirm({
        title: t('litePortal.common.deleteTitle', vars),
        message: t('litePortal.policies.deleteMessage'),
        confirmLabel: t('lite.common.delete'),
        cancelLabel: t('lite.common.cancel'),
        destructive: true,
      });
      if (!ok) return;
      await run(() => remove({ variables: { id: row.id } }), t('litePortal.policies.deleted', vars));
    },
    [confirm, remove, run, t],
  );

  const columns = useMemo(() => buildPolicyColumns(t, { onEdit: setEditing, onDelete }), [t, onDelete]);
  const { fetchRows, refetchRef } = useClientTable(rows, policySearchText, columns);

  const close = () => {
    setCreating(false);
    setEditing(null);
  };

  const onSubmit = async (values: PolicyFormValues) => {
    const ok = await run(
      () => upsert({ variables: { id: editing?.id ?? null, input: toPolicyInput(values) } }),
      t('litePortal.policies.saved', { vars: { name: values.title } }),
    );
    if (ok) close();
  };

  return (
    <Stack spacing={2}>
      <PageHeader title={t('litePortal.policies.title')} subtitle={t('litePortal.policies.subtitle')} />
      <QueryGuard loading={loading && !data} error={error} loadingLabel={t('lite.common.loading')}>
        <DuncitTable<LiteAdminPolicy>
          tableId="lite-policies"
          ariaLabel={t('litePortal.policies.title')}
          columns={columns}
          fetchRows={fetchRows}
          getRowId={policyRowId}
          emptyText={t('litePortal.policies.empty')}
          searchPlaceholder={t('litePortal.policies.search')}
          defaultSort={{ field: 'sort_order', dir: 'asc' }}
          refetchRef={refetchRef}
          toolbarActions={
            <DuncitButton size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)} data-testid="policy-add">
              {t('litePortal.policies.add')}
            </DuncitButton>
          }
        />
      </QueryGuard>
      <PolicyForm open={creating || Boolean(editing)} initial={editing} busy={upsertState.loading} onClose={close} onSubmit={onSubmit} />
    </Stack>
  );
}
