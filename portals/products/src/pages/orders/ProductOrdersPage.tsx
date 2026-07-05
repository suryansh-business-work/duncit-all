import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { PRODUCT_ORDERS } from './queries';
import { ALL_STATUSES, STATUS_COLOR, humaniseStatus, type FulfilmentStatus } from './constants';
import { useDateFormat } from '../../utils/dateFormat';

const METHODS = ['SHIP', 'PICKUP'];

export default function ProductOrdersPage() {
  const navigate = useNavigate();
  const { formatDateTime } = useDateFormat();
  const [method, setMethod] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const filter = {
    fulfilment_method: method || undefined,
    fulfilment_status: status || undefined,
    search: search || undefined,
  };
  const { data, loading, error } = useQuery(PRODUCT_ORDERS, {
    variables: { filter },
    fetchPolicy: 'cache-and-network',
  });
  const orders = data?.productOrders ?? [];

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" fontWeight={700}>
          Product orders
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Every product order placed inside a pod — fulfilment ops for shipping and pickup.
        </Typography>
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField size="small" label="Search" value={search} onChange={(event) => setSearch(event.target.value)} />
        <TextField
          size="small"
          select
          label="Method"
          value={method}
          onChange={(event) => setMethod(event.target.value)}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="">All methods</MenuItem>
          {METHODS.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          select
          label="Status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All statuses</MenuItem>
          {ALL_STATUSES.map((option) => (
            <MenuItem key={option} value={option}>
              {humaniseStatus(option)}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {error && <Alert severity="error">{error.message}</Alert>}

      {loading && orders.length === 0 ? (
        <CircularProgress />
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Order</TableCell>
              <TableCell>Buyer</TableCell>
              <TableCell>Pod</TableCell>
              <TableCell>Method</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>AWB</TableCell>
              <TableCell align="right">Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map((order: any) => (
              <TableRow
                key={order.id}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => navigate(`/orders/${order.id}`)}
              >
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {order.order_no}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatDateTime(order.created_at)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{order.buyer_name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {order.buyer_email}
                  </Typography>
                </TableCell>
                <TableCell>{order.pod?.pod_title ?? '—'}</TableCell>
                <TableCell>
                  <Chip size="small" variant="outlined" label={order.fulfilment_method} />
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={humaniseStatus(order.fulfilment_status)}
                    color={STATUS_COLOR[order.fulfilment_status as FulfilmentStatus] ?? 'default'}
                  />
                </TableCell>
                <TableCell>{order.shiprocket?.awb || '—'}</TableCell>
                <TableCell align="right">
                  {order.currency_symbol}
                  {order.total}
                </TableCell>
              </TableRow>
            ))}
            {orders.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={7}>
                  <Alert severity="info">No orders match these filters.</Alert>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </Stack>
  );
}
