import { useNavigate } from 'react-router-dom';
import {
  Avatar,
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
import SectionCard from './SectionCard';
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
    <SectionCard
      icon={<PeopleAltIcon fontSize="small" />}
      title="Attendees"
      badge={rows.length > 0 ? rows.length : undefined}
      loading={loading && rows.length === 0}
      error={errorText}
      empty={!errorText && !loading && rows.length === 0 ? 'Nobody has joined this pod yet.' : null}
      // The table scrolls inside the card rather than the page.
      contentSx={{ p: 0, '&:last-child': { pb: 0 }, overflowX: 'auto' }}
    >
      {rows.length > 0 && (
        <Table size="small" sx={{ '& td, & th': { whiteSpace: 'nowrap' } }}>
            <TableHead>
              <TableRow>
                <TableCell>Attendee</TableCell>
                <TableCell>Seats</TableCell>
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
                      {/* A four-seat booking and a one-seat booking were the
                          same row, which is a large part of why the under-
                          billing went unnoticed for as long as it did. */}
                      <Typography variant="body2" sx={{ fontWeight: (row.seats ?? 1) > 1 ? 700 : 400 }}>
                        {row.seats ?? 1}
                      </Typography>
                      {(row.companions ?? []).map((companion) => (
                        <Typography
                          key={`${companion.name}-${companion.phone_number}`}
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
                          {companion.name} · {companion.phone_extension ?? ''} {companion.phone_number}
                        </Typography>
                      ))}
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
    </SectionCard>
  );
}
