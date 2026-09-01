import { useCallback, useMemo, useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { Box, Stack, Typography } from '@mui/material';
import PaymentsIcon from '@mui/icons-material/Payments';
import { useApolloTableFetch, type TableFilterValue } from '@duncit/table';
import { useTranslation, type Translator } from '@duncit/app-settings';
import { POD_WITHDRAWAL_GROUPS_TABLE, type PodWithdrawalGroup } from './queries';
import PodWithdrawalsTable from './PodWithdrawalsTable';
import RoleFilter from './RoleFilter';
import { ALL_ROLES, translatedRoleLabel, type RoleFilterValue } from './roles';

/**
 * Withdrawal Payments, level 1: the pods money has been withdrawn against.
 *
 * The individual requests — and the Mark Paid / Reject actions on them — live
 * one level down, on the pod's own page. Grouping here is what lets Finance see
 * a pod as settled only once every partner on it has actually been paid, which
 * a flat list of requests cannot show.
 */
export default function WithdrawalsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [role, setRole] = useState<RoleFilterValue>(ALL_ROLES);

  const fetchRows = useApolloTableFetch<PodWithdrawalGroup>(
    client,
    POD_WITHDRAWAL_GROUPS_TABLE,
    'podWithdrawalGroupsTable',
  );

  // The server reads this filter BEFORE grouping, so a pod's totals only count
  // the chosen partner's legs. An empty array when no role is picked: a filter
  // carrying an empty string is a live filter that matches nothing.
  const externalFilters = useMemo<TableFilterValue[]>(
    () => (role === ALL_ROLES ? [] : [{ field: 'requested_from', op: 'eq', value: role }]),
    [role],
  );

  const openPod = useCallback(
    (row: PodWithdrawalGroup) => navigate(`/withdrawals/${row.pod_id}`),
    [navigate],
  );

  return (
    <Box>
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          alignItems: "center",
          mb: 3
        }}>
        <PaymentsIcon color="primary" sx={{ fontSize: 28 }} />
        <Box>
          <Typography variant="h5" sx={{
            fontWeight: 700
          }}>
            {t('finance.withdrawals.title')}
          </Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {t('finance.withdrawals.subtitle')}
          </Typography>
        </Box>
      </Stack>

      <PodWithdrawalsTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        externalFilters={externalFilters}
        toolbarActions={<RoleFilter value={role} onChange={setRole} />}
        emptyText={emptyTextFor(t, role)}
        onRowClick={openPod}
      />
    </Box>
  );
}

/** Says WHY the list is empty, so a role filter never reads as "no data at all". */
function emptyTextFor(t: Translator['t'], role: RoleFilterValue): string {
  if (role === ALL_ROLES) return t('finance.withdrawals.empty');
  return t('finance.withdrawals.emptyForRole', { vars: { role: translatedRoleLabel(t, role) } });
}
