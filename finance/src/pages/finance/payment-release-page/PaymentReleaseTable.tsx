import {
  Box,
  Button,
  CircularProgress,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import RateReviewIcon from '@mui/icons-material/RateReview';
import ReleaseStatusChip, { ReleaseKindChip } from './ReleaseStatusChip';

interface Props {
  rows: any[];
  loading: boolean;
  onReview: (row: any) => void;
}

export default function PaymentReleaseTable({ rows, loading, onReview }: Readonly<Props>) {
  if (loading && rows.length === 0) {
    return <Stack alignItems="center" sx={{ p: 4 }}><CircularProgress /></Stack>;
  }
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Type</TableCell>
            <TableCell>Pod</TableCell>
            <TableCell>Beneficiary</TableCell>
            <TableCell>Requested</TableCell>
            <TableCell>Proof</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} hover>
              <TableCell><ReleaseKindChip kind={row.kind} /></TableCell>
              <TableCell>
                <Typography variant="body2" fontWeight={700}>{row.pod_title}</Typography>
                <Typography variant="caption" color="text.secondary">{row.release_id}</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">{row.beneficiary_name}</Typography>
                <Typography variant="caption" color="text.secondary">{row.beneficiary_email}</Typography>
              </TableCell>
              <TableCell>Rs {Number(row.amount_requested || 0).toFixed(2)}</TableCell>
              <TableCell>
                <Stack spacing={0.25}>
                  {row.bill_url && <Link href={row.bill_url} target="_blank" rel="noreferrer" variant="caption">Bill</Link>}
                  {row.evidence_media?.length ? <Typography variant="caption">{row.evidence_media.length} media files</Typography> : null}
                  {row.notes && <Typography variant="caption" color="text.secondary">{row.notes}</Typography>}
                </Stack>
              </TableCell>
              <TableCell><ReleaseStatusChip status={row.status} /></TableCell>
              <TableCell align="right">
                <Button size="small" startIcon={<RateReviewIcon />} disabled={row.status !== 'PENDING'} onClick={() => onReview(row)}>
                  Review
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow><TableCell colSpan={7}><Typography align="center" color="text.secondary" sx={{ py: 3 }}>No payment release requests found.</Typography></TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </Box>
  );
}