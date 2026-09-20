import { useEffect, useMemo, useState } from 'react';
import {
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { DuncitButton } from '@duncit/buttons';
import {
  joinPhone,
  matchAttendanceRows,
  type PodAttendanceLabels,
  type PodAttendanceRow,
} from '@duncit/utils';

interface Props {
  open: boolean;
  rows: readonly PodAttendanceRow[];
  labels: PodAttendanceLabels;
  onClose: () => void;
  /** Hands the picked booking to the same warning a row's Mark opens. */
  onPick: (row: PodAttendanceRow) => void;
}

/**
 * One search result.
 *
 * Hoisted to module scope rather than nested in the dialog (Sonar S6478), and
 * rendered as a real button so it is reachable by keyboard and announced as
 * one — a clickable row that is only a `div` is exactly the pattern WCAG 2.2
 * AA fails on.
 */
function DirectMarkResult({
  row,
  labels,
  onPick,
}: Readonly<{
  row: PodAttendanceRow;
  labels: PodAttendanceLabels;
  onPick: (row: PodAttendanceRow) => void;
}>) {
  const phone = joinPhone(row.phone_extension, row.phone_number);
  const detail = [phone, row.ticket_code, row.seats > 1 ? labels.seats(row.seats) : '']
    .filter(Boolean)
    .join(' · ');

  return (
    <DuncitButton
      variant="outlined"
      disabled={row.attended}
      onClick={() => onPick(row)}
      data-testid={`attendance-direct-result-${row.membership_id}`}
      sx={{
        borderRadius: '16px',
        // Two lines of prose on a button, so MUI's centred upper-cased label
        // treatment is undone once here rather than fought with per child.
        textTransform: 'none',
        textAlign: 'left',
        justifyContent: 'flex-start',
        alignItems: 'center',
        gap: 1.25,
        px: 1.5,
        py: 1.25,
      }}
    >
      <Stack sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle2" noWrap sx={{ fontWeight: 800 }}>
          {row.name}
        </Typography>
        <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
          {detail}
        </Typography>
      </Stack>
      {row.attended ? (
        <Chip
          size="small"
          color="success"
          icon={<CheckCircleIcon />}
          label={labels.markedChip}
          sx={{ fontWeight: 800 }}
        />
      ) : (
        <ChevronRightIcon fontSize="small" />
      )}
    </DuncitButton>
  );
}

/**
 * The Club Admin's by-name mark, as its own door on the page.
 *
 * The roster answers "who booked this pod". This answers the question an admin
 * is actually asked at the venue — "the host never scanned me, my name is X" —
 * and it is a separate question, because the person asking it is not looking
 * over the admin's shoulder at a list. Typing the name narrows the pod's
 * bookings to theirs; picking one hands off to the same warning a row's Mark
 * opens, so nothing is written from this dialog directly (rule 41).
 *
 * Bookings that are already marked stay in the results, disabled and chipped:
 * "I cannot find them" and "somebody already marked them" are different
 * answers, and dropping the second reads as the first.
 */
export default function DirectMarkDialog({
  open,
  rows,
  labels,
  onClose,
  onPick,
}: Readonly<Props>) {
  const [query, setQuery] = useState('');

  // A fresh search every time it opens — the previous attendee's name left in
  // the box is the one thing that could put the next mark on the wrong person.
  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  const results = useMemo(() => matchAttendanceRows(rows, query), [rows, query]);
  // Hoisted so the conditional sits at nesting 0 rather than inside the JSX
  // (Sonar S3358). A pod nobody booked and a name nobody matches are different
  // dead ends, and telling an admin to check their spelling on an empty roster
  // would send them looking for a typo that is not there.
  const nothingText = rows.length === 0 ? labels.emptyRoster : labels.directNoMatch;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      data-testid="attendance-direct-dialog"
    >
      <DialogTitle sx={{ fontWeight: 800 }}>{labels.directTitle}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {labels.directBody}
          </Typography>
          {/* No autoFocus: the a11y gate refuses it, and MUI's focus trap
              already lands on this field as the dialog's first control. */}
          <TextField
            fullWidth
            size="small"
            label={labels.directSearchLabel}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            data-testid="attendance-direct-search"
          />
          <Stack spacing={1} aria-live="polite" data-testid="attendance-direct-results">
            {results.map((row) => (
              <DirectMarkResult
                key={row.membership_id}
                row={row}
                labels={labels}
                onPick={onPick}
              />
            ))}
            {results.length === 0 && (
              <Typography
                variant="body2"
                data-testid="attendance-direct-no-match"
                sx={{ color: 'text.secondary' }}
              >
                {nothingText}
              </Typography>
            )}
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} data-testid="attendance-direct-cancel">
          {labels.chooseCancel}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
