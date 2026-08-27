import { Box, Collapse, TableCell, TableRow } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { DuncitIconButton } from '@duncit/buttons';
import { PodParticipationTimeline } from '@duncit/ui';
import { participationInputFrom, type PodParticipationFields } from '@duncit/utils';
import { fmtDateTime } from './format';

/** The chevron that opens one attendee's story. Absent when there is none. */
export function ParticipationToggle({
  open,
  disabled,
  onToggle,
}: Readonly<{ open: boolean; disabled: boolean; onToggle: () => void }>) {
  if (disabled) return null;
  return (
    <DuncitIconButton
      size="small"
      aria-label={open ? 'Hide participation timeline' : 'Show participation timeline'}
      onClick={onToggle}
    >
      {open ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
    </DuncitIconButton>
  );
}

/**
 * One attendee's whole story, under their row.
 *
 * The table says what they are now; this says how they got there — which
 * backouts they raised, what each one's DUN-BKO id is, and whether they turned
 * up. Same component and same nodes as the member's own Pod History, so an
 * admin looking at a complaint is reading the screen the complainant is
 * describing.
 */
export default function AttendeeParticipationRow({
  open,
  colSpan,
  participation,
  podDateTime,
}: Readonly<{
  open: boolean;
  colSpan: number;
  participation: PodParticipationFields | null;
  podDateTime?: string | null;
}>) {
  return (
    <TableRow>
      <TableCell sx={{ py: 0, borderBottom: open ? undefined : 'none' }} colSpan={colSpan}>
        <Collapse in={open} timeout="auto" unmountOnExit>
          <Box sx={{ py: 1.5, pl: 1, whiteSpace: 'normal' }}>
            <PodParticipationTimeline
              input={participationInputFrom(participation, podDateTime)}
              formatDateTime={fmtDateTime}
            />
          </Box>
        </Collapse>
      </TableCell>
    </TableRow>
  );
}
