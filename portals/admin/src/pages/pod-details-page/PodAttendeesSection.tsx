import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { StatusChip, type StatusColorMap } from '@duncit/ui';
import type { AdminPodAttendeeRow } from './queries';
import { fmtDateTime } from './format';

const STATUS_COLORS: StatusColorMap = {
  Host: 'primary',
  Joined: 'success',
  'Backout in process': 'warning',
  'Backed out': 'error',
  Attendee: 'default',
};

function statusLabel(row: AdminPodAttendeeRow): string {
  if (row.status === 'JOINED') return 'Joined';
  if (row.status === 'BACKOUT_IN_PROCESS') return 'Backout in process';
  if (row.status === 'BACKED_OUT') return 'Backed out';
  return row.is_host ? 'Host' : 'Attendee';
}

interface Props {
  rows: AdminPodAttendeeRow[];
  loading: boolean;
  errorText?: string;
}

/** Everyone on the pod with contacts. A member whose seat was rebooked renders
 * struck-through with the replacement's name right under it. */
export default function PodAttendeesSection({ rows, loading, errorText }: Readonly<Props>) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <PeopleAltIcon color="primary" />
          <Typography variant="subtitle1" fontWeight={900}>
            Attendees ({rows.length})
          </Typography>
        </Stack>
        <Divider sx={{ mb: 1 }} />
        {errorText && <Alert severity="error">{errorText}</Alert>}
        {!errorText && loading && rows.length === 0 && <CircularProgress size={20} sx={{ my: 2 }} />}
        {!errorText && !loading && rows.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ my: 2 }}>
            No attendees yet.
          </Typography>
        )}
        {rows.length > 0 && (
          <Table size="small" sx={{ '& td, & th': { whiteSpace: 'nowrap' } }}>
            <TableHead>
              <TableRow>
                <TableCell>Attendee</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Source</TableCell>
                <TableCell>Joined</TableCell>
                <TableCell>Refund</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => {
                const struck = row.status === 'BACKED_OUT';
                return (
                  <TableRow key={row.member_id ?? row.user_id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar src={row.profile_photo ?? undefined} sx={{ width: 30, height: 30 }}>
                          {(row.full_name?.[0] ?? '?').toUpperCase()}
                        </Avatar>
                        <Stack>
                          <Link
                            component="button"
                            underline="hover"
                            onClick={() => navigate(`/users/${row.user_id}`)}
                            sx={{
                              textAlign: 'left',
                              fontWeight: 700,
                              ...(struck && { textDecoration: 'line-through', color: 'text.disabled' }),
                            }}
                          >
                            {row.full_name ?? 'Unknown user'}
                          </Link>
                          {struck && row.replaced_by_user_id && (
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <SwapHorizIcon sx={{ fontSize: 14 }} color="warning" />
                              <Typography variant="caption" color="warning.main">
                                Spot filled by{' '}
                                <Link
                                  component="button"
                                  underline="hover"
                                  onClick={() => navigate(`/users/${row.replaced_by_user_id}`)}
                                  sx={{ fontWeight: 700, verticalAlign: 'baseline' }}
                                >
                                  {row.replaced_by_name ?? 'a new attendee'}
                                </Link>{' '}
                                · {row.backout_no}
                              </Typography>
                            </Stack>
                          )}
                        </Stack>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{row.email ?? '—'}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {row.phone ?? ''}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <StatusChip status={statusLabel(row)} colorMap={STATUS_COLORS} />
                    </TableCell>
                    <TableCell>{row.source ?? '—'}</TableCell>
                    <TableCell>{fmtDateTime(row.joined_at)}</TableCell>
                    <TableCell>{row.refund_status && row.refund_status !== 'NONE' ? row.refund_status : '—'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
