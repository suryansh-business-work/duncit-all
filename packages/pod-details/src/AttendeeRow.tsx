import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Button, Link, Stack, TableCell, TableRow, Typography } from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { StatusChip, type StatusColorMap } from '@duncit/ui';
import AttendeeParticipationRow, { ParticipationToggle } from './AttendeeParticipationRow';
import type { AdminPodAttendeeRow } from './queries';
import { fmtDateTime } from './format';

const STATUS_COLORS: StatusColorMap = {
  Host: 'primary',
  Joined: 'success',
  Visited: 'success',
  'Backout in process': 'warning',
  'Backed out': 'error',
  Attendee: 'default',
};

interface Props {
  row: AdminPodAttendeeRow;
  statusText: string;
  podDateTime?: string | null;
  /** Table columns, so the expanded story spans the whole width. */
  colSpan: number;
  /** Club Admin only: mark this booking present without a scan. Absent for
   * everyone else — the host must scan, because the host is paid on the
   * result. */
  onForceAttendance?: (membershipId: string) => void;
  forcing?: boolean;
}

/** One person on the pod, with their participation story folded underneath. */
export default function AttendeeRow({
  row,
  statusText,
  podDateTime,
  colSpan,
  onForceAttendance,
  forcing,
}: Readonly<Props>) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const struck = row.status === 'BACKED_OUT';
  const seats = row.seats ?? 1;

  return (
    <>
      <TableRow hover>
        <TableCell sx={{ width: 40 }}>
          <ParticipationToggle
            open={open}
            disabled={!row.participation}
            onToggle={() => setOpen((was) => !was)}
          />
        </TableCell>
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
          {/* A four-seat booking and a one-seat booking were the same row, which
              is a large part of why the under-billing went unnoticed. */}
          <Typography variant="body2" sx={{ fontWeight: seats > 1 ? 700 : 400 }}>
            {seats}
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
          <Stack direction="row" spacing={0.75} alignItems="center">
            <StatusChip status={statusText} colorMap={STATUS_COLORS} />
            {/* Club Admin's override, and only theirs — the host has to scan,
                because attendance decides what the host is paid. Offered only
                while this booking is un-scanned and still on the pod. */}
            {onForceAttendance && row.member_id && !row.participation?.attended && !struck && (
              <Button
                size="small"
                variant="text"
                disabled={forcing}
                onClick={() => onForceAttendance(row.member_id as string)}
                sx={{ fontWeight: 800, textTransform: 'none' }}
              >
                {forcing ? 'Marking…' : 'Mark present'}
              </Button>
            )}
          </Stack>
        </TableCell>
        <TableCell>{row.source ?? '—'}</TableCell>
        <TableCell>{fmtDateTime(row.joined_at)}</TableCell>
        <TableCell>
          {row.refund_status && row.refund_status !== 'NONE' ? row.refund_status : '—'}
        </TableCell>
      </TableRow>
      <AttendeeParticipationRow
        open={open}
        colSpan={colSpan}
        participation={row.participation}
        podDateTime={podDateTime}
      />
    </>
  );
}
