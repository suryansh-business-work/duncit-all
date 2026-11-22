import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Box, Link, Stack } from '@mui/material';
import { QueryGuard } from '@duncit/ui';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { parseApiError, roleLabelKey } from '@duncit/utils';
import { AskDuncitRolePolicyForm, type AskDuncitRolePolicyValues } from '../../../forms/ask-duncit-role-policy';
import PageHeader from '../shared/PageHeader';
import RoleSelect from '../shared/RoleSelect';
import { RESET_ASK_DUNCIT_ROLE_POLICY, UPDATE_ASK_DUNCIT_ROLE_POLICY } from '../shared/mutations';
import { ASK_DUNCIT_SETTINGS, ASK_DUNCIT_TOOL_CATEGORIES } from '../shared/queries';
import type { AskDuncitSettings, RoleKey } from '../shared/types';
import { useCanControl } from '../shared/useCanControl';
import KillSwitchCard from './KillSwitchCard';

/**
 * Ask Duncit › AI Agent Control Center (super admins). The levers that change
 * what the assistant may do for people: the emergency stop (global and per
 * role), each role's capabilities, model, approval rule, quotas and
 * instructions. Every change is an immutable audit row.
 */
export default function AskDuncitControlCenterPage() {
  const { t } = useTranslation();
  const canControl = useCanControl();
  const confirm = useConfirm();
  const [role, setRole] = useState<RoleKey>('MEMBER');
  const { data, loading, error, refetch } = useQuery<{ askDuncitSettings: AskDuncitSettings }>(ASK_DUNCIT_SETTINGS, { fetchPolicy: 'cache-and-network' });
  const categories = useQuery<{ askDuncitToolCategories: Array<{ key: string; label: string }> }>(ASK_DUNCIT_TOOL_CATEGORIES, { fetchPolicy: 'cache-first' });
  const [save, saving] = useMutation(UPDATE_ASK_DUNCIT_ROLE_POLICY);
  const [reset] = useMutation(RESET_ASK_DUNCIT_ROLE_POLICY);
  const settings = data?.askDuncitSettings;
  const policy = settings?.roles.find((r) => r.role_key === role);
  const initialValues = useMemo<AskDuncitRolePolicyValues | null>(
    () =>
      policy
        ? {
            enabled: policy.enabled,
            model: policy.model,
            max_output_tokens: policy.max_output_tokens,
            allow_write: policy.allow_write,
            approve_all_writes: policy.approve_all_writes,
            messages_per_minute: policy.messages_per_minute,
            messages_per_day: policy.messages_per_day,
            tokens_per_day: policy.tokens_per_day,
            allowed_categories: policy.allowed_categories,
            instructions: policy.instructions,
          }
        : null,
    [policy]
  );
  const reload = () => {
    refetch().catch(() => undefined);
  };

  const onSubmit = async (values: AskDuncitRolePolicyValues) => {
    try {
      await save({ variables: { role, input: values } });
      reload();
      notifySuccess(t('ai.askDuncit.saved'));
    } catch (e) {
      notifyError(parseApiError(e) || t('ai.askDuncit.saveFailed'));
    }
  };
  const onReset = async () => {
    const ok = await confirm({ title: t('ai.askDuncit.control.resetTitle', { vars: { role: t(roleLabelKey(role)) } }), destructive: true, confirmLabel: t('ai.askDuncit.control.reset') });
    if (!ok) return;
    try {
      await reset({ variables: { role } });
      reload();
    } catch (e) {
      notifyError(parseApiError(e) || t('ai.askDuncit.saveFailed'));
    }
  };

  return (
    <Box>
      <PageHeader title={t('ai.askDuncit.control.title')} subtitle={t('ai.askDuncit.control.subtitle')} actions={<RoleSelect value={role} onChange={setRole} />} />
      {!canControl && <Alert severity="info" sx={{ mb: 2 }}>{t('ai.askDuncit.readOnlyControl')}</Alert>}
      <QueryGuard loading={loading && !settings} error={error} errorText={t('ai.askDuncit.loadFailed')} spinnerSx={{ py: 6 }}>
        {() =>
          settings && policy && initialValues ? (
            <Stack spacing={2}>
              <KillSwitchCard role={null} on={settings.kill_switch} reason={settings.kill_switch_reason} canControl={canControl} onChanged={reload} />
              <KillSwitchCard role={role} on={policy.kill_switch} reason="" canControl={canControl} onChanged={reload} />
              <AskDuncitRolePolicyForm
                initialValues={initialValues}
                categories={categories.data?.askDuncitToolCategories ?? []}
                disabled={!canControl}
                submitting={saving.loading}
                onSubmit={onSubmit}
                onReset={() => { onReset().catch(() => undefined); }}
              />
              <Link component={RouterLink} to="/ask-duncit/tools">
                {t('ai.askDuncit.control.toolLink')}
              </Link>
            </Stack>
          ) : null
        }
      </QueryGuard>
    </Box>
  );
}
