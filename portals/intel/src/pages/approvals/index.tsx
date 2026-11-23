import { useSearchParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Alert, Button, FormControlLabel, MenuItem, Skeleton, Stack, Switch, TextField } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { EmptyState, PageHeader } from '@duncit/ui';
import ApprovalCard from '../../components/approval/ApprovalCard';
import { useBootstrap } from '../../components/IntelBootstrap';
import { INTEL_APPROVALS, type ApprovalsData } from '../../graphql/approvals';
import { mayDecide } from '../../lib/approval';

const STATUSES = ['PENDING', 'EXECUTED', 'FAILED', 'REJECTED', 'EXPIRED', 'ALL'] as const;
const STATUS_KEYS: Record<(typeof STATUSES)[number], string> = {
  PENDING: 'intel.approval.status.PENDING',
  EXECUTED: 'intel.approval.status.EXECUTED',
  FAILED: 'intel.approval.status.FAILED',
  REJECTED: 'intel.approval.status.REJECTED',
  EXPIRED: 'intel.approval.status.EXPIRED',
  ALL: 'intel.approvals.all',
};

/**
 * Changes the assistant proposed. Admins see everyone's; employees see their
 * own. Filters live in the URL so a link to "pending" can be shared.
 */
export default function ApprovalsPage() {
  const { t } = useTranslation();
  const { data: boot } = useBootstrap();
  const [params, setParams] = useSearchParams();
  const status = (STATUSES as readonly string[]).includes(params.get('status') ?? '') ? (params.get('status') as (typeof STATUSES)[number]) : 'PENDING';
  const mine = params.get('mine') === '1' || boot?.me.can_admin === false;
  const { data, loading, error, refetch } = useQuery<ApprovalsData>(INTEL_APPROVALS, { variables: { status: status === 'ALL' ? null : status, mine, limit: 100 }, fetchPolicy: 'cache-and-network' });
  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value === null) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };
  const rows = data?.intelApprovals ?? [];

  return (
    <Stack spacing={2} sx={{ maxWidth: 1000 }}>
      <PageHeader title={t('intel.approvals.title')} subtitle={t('intel.approvals.subtitle')} />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
        <TextField select size="small" label={t('intel.approvals.statusLabel')} value={status} onChange={(e) => set('status', e.target.value)} sx={{ minWidth: 200 }}>
          {STATUSES.map((s) => (
            <MenuItem key={s} value={s}>{t(STATUS_KEYS[s])}</MenuItem>
          ))}
        </TextField>
        {boot?.me.can_admin && <FormControlLabel control={<Switch checked={mine} onChange={(e) => set('mine', e.target.checked ? '1' : null)} />} label={t('intel.approvals.mineOnly')} />}
      </Stack>
      {error && <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => refetch().catch(() => undefined)}>{t('intel.common.retry')}</Button>}>{t('intel.approvals.loadFailed')}</Alert>}
      {loading && !data && [0, 1].map((i) => <Skeleton key={i} variant="rounded" height={160} />)}
      {data && rows.length === 0 && <EmptyState title={t('intel.approvals.empty')} body={t('intel.approvals.emptyBody')} />}
      {rows.map((a) => (
        <ApprovalCard key={a.id} approval={a} canDecide={mayDecide(a, boot?.me)} />
      ))}
    </Stack>
  );
}
