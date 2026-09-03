import { Avatar, Box, Chip, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import GroupIcon from '@mui/icons-material/Group';
import { DuncitButton } from '@duncit/buttons';
import {
  attendanceRowState,
  joinPhone,
  type PodAttendanceLabels,
  type PodAttendanceRow,
  type PodAttendanceViewer,
} from '@duncit/utils';

interface Props {
  row: PodAttendanceRow;
  labels: PodAttendanceLabels;
  canMark: boolean;
  /** Who is reading the roster: only the host waits on the door's companions. */
  viewer: PodAttendanceViewer;
  /** True only for the row currently being written. */
  busy: boolean;
  formatDateTime: (iso: string) => string;
  /** Absent once the roster is locked — the row then renders read-only. */
  onMark?: (row: PodAttendanceRow) => void;
}

/**
 * One attendee.
 *
 * The whole row turns green when they are marked, not just an icon: the host is
 * scanning a list at a door, and a tick the size of a full stop is exactly the
 * signal that got missed. The row also says HOW they were marked, because a
 * scan and a by-hand mark are not the same evidence.
 */
export default function AttendanceRow({
  row,
  labels,
  canMark,
  viewer,
  busy,
  formatDateTime,
  onMark,
}: Readonly<Props>) {
  const state = attendanceRowState(row, canMark, viewer);
  const marked = state === 'MARKED';
  const phone = joinPhone(row.phone_extension, row.phone_number);

  const caption = marked
    ? [
        row.marked_method ? labels.methodLabel(row.marked_method) : '',
        row.marked_by_name ? labels.markedBy(row.marked_by_name) : '',
        row.attended_at ? labels.markedAt(formatDateTime(row.attended_at)) : '',
      ]
        .filter(Boolean)
        .join(' · ')
    : phone || row.email;

  return (
    <Stack
      direction="row"
      spacing={1.25}
      data-testid={`attendance-row-${row.membership_id}`}
      sx={{
        alignItems: "center",
        px: 1.25,
        py: 1.25,
        borderRadius: '16px',
        border: 1,

        // Green is the state, so it carries the border and the ground too.
        borderColor: marked ? 'success.main' : 'divider',

        // A TINT, not `success.light`: MUI pairs that shade with a near-white
        // `contrastText`, which lands under 4.5:1 on the body copy in this row.
        // The same rgba the native twin uses, so the two read identically.
        bgcolor: marked ? 'rgba(46,160,67,0.14)' : 'background.paper'
      }}>
      <Avatar src={row.avatar_url || undefined} sx={{ width: 36, height: 36 }}>
        {(row.name[0] ?? '?').toUpperCase()}
      </Avatar>

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Stack
          direction="row"
          spacing={0.75}
          sx={{
            alignItems: "center",
            minWidth: 0
          }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>
            {row.name}
          </Typography>
          {row.seats > 1 && (
            <Chip
              size="small"
              icon={<GroupIcon />}
              label={labels.seats(row.seats)}
              sx={{ height: 20, fontWeight: 700 }}
            />
          )}
        </Stack>
        <Typography
          variant="caption"
          noWrap
          sx={{
            color: "text.secondary",
            display: "block"
          }}>
          {caption}
        </Typography>
        {marked && row.verified_phone && (
          <Typography
            variant="caption"
            noWrap
            sx={{
              color: "text.secondary",
              display: "block"
            }}>
            {labels.verifiedPhone(row.verified_phone)}
          </Typography>
        )}
        {state === 'NEEDS_COMPANIONS' && (
          <Typography
            variant="caption"
            sx={{
              color: "warning.main",
              display: "block"
            }}>
            {labels.companionsNeeded(row.companions_required)}
          </Typography>
        )}
      </Box>

      {marked ? (
        <Chip
          size="small"
          color="success"
          icon={<CheckCircleIcon />}
          label={labels.markedChip}
          sx={{ fontWeight: 800 }}
        />
      ) : (
        <Stack direction="row" spacing={0.75} sx={{
          alignItems: "center"
        }}>
          <RadioButtonUncheckedIcon fontSize="small" color="disabled" />
          {onMark && (
            <DuncitButton
              size="small"
              variant="contained"
              disabled={busy || state !== 'READY'}
              onClick={() => onMark(row)}
              sx={{ borderRadius: 999, fontWeight: 800, flexShrink: 0 }}
            >
              {busy ? labels.marking : labels.markButton}
            </DuncitButton>
          )}
        </Stack>
      )}
    </Stack>
  );
}
