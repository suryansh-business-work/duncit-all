import { Chip, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import HostRequestRowActions from './HostRequestRowActions';
import type { HostRequest, HostRequestStatus } from './queries';

const STATUS_COLORS: Record<HostRequestStatus, 'default' | 'info' | 'success' | 'error'> = {
  REQUESTED: 'default',
  ACKNOWLEDGED: 'info',
  APPROVED: 'success',
  REJECTED: 'error',
};

const catPath = (r: HostRequest) =>
  [r.super_category_name, r.category_name, r.sub_category_name].filter(Boolean).join(' › ') || '—';

interface Props {
  requests: HostRequest[];
  busy: boolean;
  onAcknowledge: (r: HostRequest) => void;
  onApprove: (r: HostRequest) => void;
  onReject: (r: HostRequest) => void;
}

export default function HostRequestsTable({ requests, busy, onAcknowledge, onApprove, onReject }: Readonly<Props>) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Request ID</TableCell>
          <TableCell>Host Name</TableCell>
          <TableCell>Category</TableCell>
          <TableCell>Requested On</TableCell>
          <TableCell>Status</TableCell>
          <TableCell align="right">Action</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {requests.map((r) => (
          <TableRow key={r.id} hover>
            <TableCell>
              <Typography variant="body2" fontWeight={700}>{r.request_no}</Typography>
            </TableCell>
            <TableCell><Typography variant="body2">{r.host_name || '—'}</Typography></TableCell>
            <TableCell><Typography variant="body2">{catPath(r)}</Typography></TableCell>
            <TableCell><Typography variant="body2">{new Date(r.created_at).toLocaleString()}</Typography></TableCell>
            <TableCell><Chip size="small" color={STATUS_COLORS[r.status]} label={r.status} /></TableCell>
            <TableCell align="right">
              <HostRequestRowActions
                request={r}
                busy={busy}
                onAcknowledge={onAcknowledge}
                onApprove={onApprove}
                onReject={onReject}
              />
            </TableCell>
          </TableRow>
        ))}
        {requests.length === 0 && (
          <TableRow><TableCell colSpan={6} align="center">No host requests found.</TableCell></TableRow>
        )}
      </TableBody>
    </Table>
  );
}
