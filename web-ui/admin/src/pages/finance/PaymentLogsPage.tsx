import { useMemo, useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import RefreshIcon from '@mui/icons-material/Refresh';

const PAYMENTS = gql`
  query AdminPayments($filter: PaymentFilterInput, $limit: Int) {
    payments(filter: $filter, limit: $limit) {
      id
      payment_id
      invoice_no
      user_name
      user_email
      description
      subtotal
      platform_fee_amount
      gst_amount
      total
      currency_symbol
      status
      gateway
      gateway_ref
      paid_at
      created_at
    }
  }
`;

const STATUS_COLORS: Record<string, 'default' | 'warning' | 'info' | 'success' | 'error'> = {
  PENDING: 'warning',
  SUCCESS: 'success',
  FAILED: 'error',
  REFUNDED: 'info',
};

export default function PaymentLogsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const filter = useMemo(() => {
    const f: any = {};
    if (statusFilter) f.status = statusFilter;
    if (search.trim()) f.search = search.trim();
    return Object.keys(f).length ? f : undefined;
  }, [statusFilter, search]);

  const { data, loading, refetch } = useQuery(PAYMENTS, {
    variables: { filter, limit: 200 },
    fetchPolicy: 'cache-and-network',
    pollInterval: 30000,
  });

  const items: any[] = data?.payments ?? [];

  const totals = useMemo(() => {
    return items.reduce(
      (a, p) => {
        if (p.status === 'SUCCESS') {
          a.gross += p.total;
          a.fee += p.platform_fee_amount;
          a.gst += p.gst_amount;
          a.count += 1;
        }
        return a;
      },
      { gross: 0, fee: 0, gst: 0, count: 0 }
    );
  }, [items]);

  const fmt = (n: number, sym = '₹') => `${sym}${n.toFixed(2)}`;

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <ReceiptLongIcon color="primary" />
        <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>
          Payment Logs
        </Typography>
        <Tooltip title="Refresh">
          <IconButton onClick={() => refetch()}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent sx={{ py: 1.5 }}>
            <Typography variant="caption" color="text.secondary">Successful Payments</Typography>
            <Typography variant="h6" fontWeight={700}>{totals.count}</Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent sx={{ py: 1.5 }}>
            <Typography variant="caption" color="text.secondary">Gross</Typography>
            <Typography variant="h6" fontWeight={700}>{fmt(totals.gross)}</Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent sx={{ py: 1.5 }}>
            <Typography variant="caption" color="text.secondary">Platform Fees</Typography>
            <Typography variant="h6" fontWeight={700}>{fmt(totals.fee)}</Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent sx={{ py: 1.5 }}>
            <Typography variant="caption" color="text.secondary">GST Collected</Typography>
            <Typography variant="h6" fontWeight={700}>{fmt(totals.gst)}</Typography>
          </CardContent>
        </Card>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          select
          size="small"
          label="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="PENDING">Pending</MenuItem>
          <MenuItem value="SUCCESS">Success</MenuItem>
          <MenuItem value="FAILED">Failed</MenuItem>
          <MenuItem value="REFUNDED">Refunded</MenuItem>
        </TextField>
        <TextField
          size="small"
          label="Search (txn id, invoice, name, email)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1 }}
        />
      </Stack>

      <Card>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          {loading && !data ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <CircularProgress />
            </Box>
          ) : items.length === 0 ? (
            <Alert severity="info" sx={{ m: 2 }}>No payments yet.</Alert>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>When</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Subtotal</TableCell>
                    <TableCell align="right">Fee</TableCell>
                    <TableCell align="right">GST</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>IDs</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((p) => (
                    <TableRow key={p.id} hover>
                      <TableCell>
                        <Typography variant="caption">
                          {new Date(p.created_at).toLocaleString('en-IN')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{p.user_name}</Typography>
                        <Typography variant="caption" color="text.secondary">{p.user_email}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{p.description}</Typography>
                      </TableCell>
                      <TableCell align="right">{fmt(p.subtotal, p.currency_symbol)}</TableCell>
                      <TableCell align="right">{fmt(p.platform_fee_amount, p.currency_symbol)}</TableCell>
                      <TableCell align="right">{fmt(p.gst_amount, p.currency_symbol)}</TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={700}>
                          {fmt(p.total, p.currency_symbol)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" color={STATUS_COLORS[p.status]} label={p.status} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace' }}>
                          {p.payment_id}
                        </Typography>
                        {p.invoice_no && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                            {p.invoice_no}
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

