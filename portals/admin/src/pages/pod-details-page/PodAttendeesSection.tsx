import { Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import { podParticipationActions, participationInputFrom } from '@duncit/utils';
import AttendeeRow from './AttendeeRow';
import SectionCard from './SectionCard';
import type { AdminPodAttendeeRow } from './queries';

const COLUMNS = ['', 'Attendee', 'Seats', 'Contact', 'Status', 'Source', 'Joined', 'Refund'];

/**
 * What to call this person's booking.
 *
 * "Visited" once the pod has happened, from the same rule mWeb and the app use
 * — an admin reading a complaint should see the word the member is quoting.
 */
function statusLabel(row: AdminPodAttendeeRow, podDateTime?: string | null): string {
  if (row.status === 'BACKOUT_IN_PROCESS') return 'Backout in process';
  if (row.status === 'BACKED_OUT') return 'Backed out';
  if (row.status === 'JOINED') {
    const gate = podParticipationActions(participationInputFrom(row.participation, podDateTime));
    return gate.joinedLabelKind === 'VISITED' ? 'Visited' : 'Joined';
  }
  return row.is_host ? 'Host' : 'Attendee';
}

interface Props {
  rows: AdminPodAttendeeRow[];
  loading: boolean;
  podDateTime?: string | null;
  errorText?: string;
}

/** Everyone on the pod with contacts. A member whose seat was rebooked renders
 * struck-through with the replacement's name right under it, and every row
 * opens onto the participation timeline the member sees. */
export default function PodAttendeesSection({
  rows,
  loading,
  podDateTime,
  errorText,
}: Readonly<Props>) {
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
              {COLUMNS.map((column) => (
                <TableCell key={column || 'expand'}>{column}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <AttendeeRow
                key={row.member_id ?? row.user_id}
                row={row}
                statusText={statusLabel(row, podDateTime)}
                podDateTime={podDateTime}
                colSpan={COLUMNS.length}
              />
            ))}
          </TableBody>
        </Table>
      )}
    </SectionCard>
  );
}
