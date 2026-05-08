import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import UndoIcon from '@mui/icons-material/Undo';
import { STATUS_COLORS, fmt } from './helpers';

interface Props {
  loading: boolean;
  hasData: boolean;
  items: any[];
  downloadingId: string | null;
  onDownload: (p: any) => void;
  onRefund: (p: any) => void;
}

export default function PaymentsTable({
  loading,
  hasData,
  items,
  downloadingId,
  onDownload,
  onRefund,
}: Props) {
  return (
    <Card>
      <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
        {loading && !hasData ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        ) : items.length === 0 ? (
          <Alert severity="info" sx={{ m: 2 }}>
            No payments yet.
          </Alert>
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
                  <TableCell align="right">Actions</TableCell>
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
                      <Typography variant="body2" fontWeight={600}>
                        {p.user_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {p.user_email}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{p.description}</Typography>
                    </TableCell>
                    <TableCell align="right">{fmt(p.subtotal, p.currency_symbol)}</TableCell>
                    <TableCell align="right">
                      {fmt(p.platform_fee_amount, p.currency_symbol)}
                    </TableCell>
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
                      <Typography
                        variant="caption"
                        sx={{ display: 'block', fontFamily: 'monospace' }}
                      >
                        {p.payment_id}
                      </Typography>
                      {p.invoice_no && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontFamily: 'monospace' }}
                        >
                          {p.invoice_no}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip
                          title={p.invoice_no ? 'Download invoice' : 'No invoice generated'}
                        >
                          <span>
                            <IconButton
                              size="small"
                              disabled={!p.invoice_no || downloadingId === p.id}
                              onClick={() => onDownload(p)}
                            >
                              {downloadingId === p.id ? (
                                <CircularProgress size={16} />
                              ) : (
                                <DownloadIcon fontSize="small" />
                              )}
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip
                          title={
                            p.status === 'SUCCESS'
                              ? 'Refund'
                              : 'Only successful payments can be refunded'
                          }
                        >
                          <span>
                            <IconButton
                              size="small"
                              color="warning"
                              disabled={p.status !== 'SUCCESS'}
                              onClick={() => onRefund(p)}
                            >
                              <UndoIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
