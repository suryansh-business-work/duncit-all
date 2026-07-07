import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { fmtDate, money, REFUND_STATUS_COLORS, type BackoutRefundRequest } from './queries';

interface Props {
  rows: readonly BackoutRefundRequest[];
  sym: string;
  onRowClick: (row: BackoutRefundRequest) => void;
  onRefund: (row: BackoutRefundRequest) => void;
}

/** Presentational table of backed-out members. Rows navigate to detail; the
 * per-row Refund button stops propagation so it opens the breakup dialog only. */
export default function BackoutRefundTable({ rows, sym, onRowClick, onRefund }: Readonly<Props>) {
  return (
    <Card variant="outlined">
      <CardContent sx={{ p: 0 }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Member</TableCell>
                <TableCell>Pod</TableCell>
                <TableCell>Backed out</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Refund status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => onRowClick(row)}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight={700}>{row.user_name ?? '—'}</Typography>
                    <Typography variant="caption" color="text.secondary">{row.user_email ?? ''}</Typography>
                  </TableCell>
                  <TableCell>{row.pod?.pod_title ?? '—'}</TableCell>
                  <TableCell>{fmtDate(row.backed_out_at)}</TableCell>
                  <TableCell align="right">{money(sym, Number(row.payment_amount ?? 0))}</TableCell>
                  <TableCell>
                    <Chip size="small" color={REFUND_STATUS_COLORS[row.refund_status]} label={row.refund_status} />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Process refund">
                      <Button
                        size="small"
                        color="warning"
                        variant="outlined"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          onRefund(row);
                        }}
                      >
                        Refund
                      </Button>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </CardContent>
    </Card>
  );
}
