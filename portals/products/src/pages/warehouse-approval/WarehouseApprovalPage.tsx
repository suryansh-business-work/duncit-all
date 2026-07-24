import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  APPROVE_WAREHOUSE_REQUEST,
  DENY_WAREHOUSE_REQUEST,
  WAREHOUSE_APPROVAL_REQUESTS,
  type WarehouseApprovalRow,
} from './queries';

const STATUS_TABS = ['PENDING', 'APPROVED', 'DENIED', 'ALL'];
const STATUS_COLOR: Record<string, 'warning' | 'success' | 'error'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  DENIED: 'error',
};

const fmtDate = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
};

/** Products portal: partner warehouses awaiting approval before they can be used
 * for shipping. Approve makes a warehouse live; Deny keeps it blocked. */
export default function WarehouseApprovalPage() {
  const [status, setStatus] = useState('PENDING');
  const { data, loading, error, refetch } = useQuery(WAREHOUSE_APPROVAL_REQUESTS, {
    variables: { status: status === 'ALL' ? null : status },
    fetchPolicy: 'cache-and-network',
  });
  const [approve] = useMutation(APPROVE_WAREHOUSE_REQUEST);
  const [deny] = useMutation(DENY_WAREHOUSE_REQUEST);
  const rows: WarehouseApprovalRow[] = data?.warehouseApprovalRequests ?? [];

  const decide = (fn: typeof approve, id: string) => {
    fn({ variables: { id } })
      .then(() => refetch())
      .catch(() => undefined);
  };

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h4" fontWeight={950}>
            Warehouse Approval
          </Typography>
          <Typography color="text.secondary">
            Approve partner warehouses before they can be used for shipping.
          </Typography>
        </Box>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={status}
          onChange={(_, value) => value && setStatus(value)}
        >
          {STATUS_TABS.map((item) => (
            <ToggleButton key={item} value={item}>
              {item}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>

      {error && <Alert severity="error">{error.message}</Alert>}
      {loading && !data ? (
        <Stack alignItems="center" sx={{ py: 6 }}>
          <CircularProgress />
        </Stack>
      ) : null}
      {!loading && rows.length === 0 ? (
        <Alert severity="info">No warehouse requests.</Alert>
      ) : null}

      <Stack spacing={1.5}>
        {rows.map((row) => (
          <Card key={row.id} variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="subtitle1" fontWeight={900} noWrap>
                      {row.title}
                    </Typography>
                    <Chip size="small" color={STATUS_COLOR[row.status] ?? 'default'} label={row.status} />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {row.summary}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {row.requested_by_name ? `By ${row.requested_by_name} · ` : ''}
                    {fmtDate(row.created_at)}
                  </Typography>
                </Box>
                {row.status === 'PENDING' ? (
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      onClick={() => decide(approve, row.id)}
                    >
                      Approve
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => decide(deny, row.id)}
                    >
                      Deny
                    </Button>
                  </Stack>
                ) : null}
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}
