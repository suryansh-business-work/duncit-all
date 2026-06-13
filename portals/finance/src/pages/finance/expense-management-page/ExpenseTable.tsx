import {
  Alert,
  Card,
  CardContent,
  Chip,
  Link,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { labelize } from './queries';

interface Props {
  expenses: any[];
  currency: string;
  onRowClick: (expense: any) => void;
}

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN');
};

/** Expense ledger table — click a row to open the detail/edit drawer. */
export default function ExpenseTable({ expenses, currency, onRowClick }: Readonly<Props>) {
  if (expenses.length === 0) {
    return <Alert severity="info">No expenses match these filters.</Alert>;
  }
  return (
    <Card variant="outlined">
      <CardContent sx={{ p: 0 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Vendor</TableCell>
              <TableCell>Method</TableCell>
              <TableCell align="right">Gross</TableCell>
              <TableCell align="right">Refund</TableCell>
              <TableCell align="right">Net</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {expenses.map((e) => (
              <TableRow key={e.id} hover sx={{ cursor: 'pointer' }} onClick={() => onRowClick(e)}>
                <TableCell>{fmtDate(e.date)}</TableCell>
                <TableCell>
                  <Chip size="small" label={labelize(e.category)} />
                  {e.description ? (
                    <Typography variant="caption" display="block" color="text.secondary" noWrap sx={{ maxWidth: 220 }}>
                      {e.description}
                    </Typography>
                  ) : null}
                </TableCell>
                <TableCell>
                  {e.vendor_name || '—'}
                  {e.attachment_url ? (
                    <Link href={e.attachment_url} target="_blank" rel="noreferrer" display="block" variant="caption" onClick={(ev) => ev.stopPropagation()}>
                      Receipt
                    </Link>
                  ) : null}
                </TableCell>
                <TableCell>{labelize(e.payment_method)}</TableCell>
                <TableCell align="right">{currency}{Number(e.amount).toFixed(2)}</TableCell>
                <TableCell align="right">
                  {e.refund_total > 0 ? (
                    <Typography variant="body2" color="warning.main">−{currency}{Number(e.refund_total).toFixed(2)}</Typography>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={700}>{currency}{Number(e.net_amount).toFixed(2)}</Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
