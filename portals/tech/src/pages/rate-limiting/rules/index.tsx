import { useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import { Snackbar, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { PageHeader, QueryGuard } from '@duncit/ui';
import { useApolloTableFetch } from '@duncit/table';
import { notifyError, useConfirm } from '@duncit/dialogs';
import { useTranslation } from '@duncit/app-settings';
import RulesTable from './RulesTable';
import RuleDialog from './RuleDialog';
import { toForm, type RateLimitRuleForm } from './rate-limit-rule';
import {
  CREATE_RULE,
  DELETE_RULE,
  OPTIONS,
  RULES_TABLE,
  SET_RULE_ENABLED,
  UPDATE_RULE,
  type RateLimitOptionsData,
  type RateLimitRuleRow,
} from '../queries';

export default function RateLimitRulesPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const confirm = useConfirm();

  const { data, loading, error } = useQuery<{ rateLimitOptions: RateLimitOptionsData }>(OPTIONS, {
    fetchPolicy: 'cache-and-network',
  });
  const [createRule] = useMutation<any>(CREATE_RULE);
  const [updateRule] = useMutation<any>(UPDATE_RULE);
  const [setEnabled] = useMutation<any>(SET_RULE_ENABLED);
  const [deleteRule] = useMutation<any>(DELETE_RULE);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<RateLimitRuleForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fetchRows = useApolloTableFetch<RateLimitRuleRow>(client, RULES_TABLE, 'rateLimitRulesTable');

  const openCreate = () => {
    setEditingId(null);
    setEditing(null);
    setOpError(null);
    setDialogOpen(true);
  };

  const openEdit = (row: RateLimitRuleRow) => {
    setEditingId(row.id);
    setEditing(toForm(row));
    setOpError(null);
    setDialogOpen(true);
  };

  const submit = async (input: Record<string, unknown>) => {
    setSaving(true);
    setOpError(null);
    try {
      if (editingId) await updateRule({ variables: { rule_id: editingId, input } });
      else await createRule({ variables: { input } });
      setDialogOpen(false);
      setToast(t('shell.common.saved'));
      refetchRef.current?.();
    } catch (e) {
      setOpError(e instanceof Error ? e.message : t('tech.rateLimit.rules.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (row: RateLimitRuleRow) => {
    try {
      await setEnabled({ variables: { rule_id: row.id, enabled: !row.enabled } });
      refetchRef.current?.();
    } catch (e) {
      notifyError(e instanceof Error ? e.message : t('tech.rateLimit.rules.saveFailed'));
    }
  };

  const remove = async (row: RateLimitRuleRow) => {
    const ok = await confirm({
      title: t('tech.rateLimit.rules.deleteRule'),
      message: t('tech.rateLimit.rules.deleteConfirm', { vars: { name: row.name } }),
      destructive: true,
      confirmLabel: t('shell.common.delete'),
    });
    if (!ok) return;
    try {
      await deleteRule({ variables: { rule_id: row.id } });
      refetchRef.current?.();
    } catch (e) {
      notifyError(e instanceof Error ? e.message : t('tech.rateLimit.rules.saveFailed'));
    }
  };

  const options = data?.rateLimitOptions;

  return (
    <Stack spacing={3}>
      <PageHeader title={t('shell.nav.rules')} subtitle={t('tech.rateLimit.rules.subtitle')} />
      <QueryGuard loading={loading && !data} error={error} errorText={error?.message}>
        {options && (
          <>
            <RulesTable
              fetchRows={fetchRows}
              refetchRef={refetchRef}
              toolbarActions={
                <DuncitButton
                  size="small"
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={openCreate}
                >
                  {t('tech.rateLimit.rules.newRule')}
                </DuncitButton>
              }
              onToggle={toggle}
              onEdit={openEdit}
              onRemove={remove}
            />
            <RuleDialog
              open={dialogOpen}
              editing={editing}
              options={options}
              saving={saving}
              opError={opError}
              onClose={() => setDialogOpen(false)}
              onSubmit={submit}
            />
          </>
        )}
      </QueryGuard>
      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        message={toast ?? ''}
      />
    </Stack>
  );
}
