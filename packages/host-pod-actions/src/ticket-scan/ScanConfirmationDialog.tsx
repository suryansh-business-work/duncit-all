import { Button, Dialog, DialogActions, DialogContent, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CompanionsChecklist, { type ChecklistPerson } from './CompanionsChecklist';
import { useHostPodActionsConfig } from '../HostPodActionsProvider';
import type { HostTicketScanResult } from '../types';

interface Props {
  /** The scan that just marked attendance — null keeps the dialog closed. */
  result: HostTicketScanResult | null;
  /** The headline the scan pane also shows ("Suryansh and 1 more are checked in."). */
  text: string;
  onDone: () => void;
}

/** Buyer first, then every companion on file — each with a green tick. */
function toPeople(result: HostTicketScanResult | null): ChecklistPerson[] {
  if (!result) return [];
  const people: ChecklistPerson[] = [];
  if (result.attendee) {
    people.push({
      key: result.attendee.user_id,
      primary: result.attendee.full_name,
      secondary: result.ticket?.ticket_code,
    });
  }
  people.push(
    ...(result.companions ?? []).map((companion) => ({
      key: `${companion.phone_number}-${companion.name}`,
      primary: companion.name,
      secondary: companion.phone_number,
    })),
  );
  return people;
}

/**
 * The unmissable "it worked": a confirmation dialog the moment a scan marks
 * attendance, listing everyone the ticket just admitted with a green tick.
 *
 * Exists because the two-step group check-in used to end on a one-line swap of
 * text that read as "nothing happened" — reported as attendance not marking.
 */
export default function ScanConfirmationDialog({ result, text, onDone }: Readonly<Props>) {
  const { labels } = useHostPodActionsConfig();
  return (
    <Dialog open={!!result} onClose={onDone} fullWidth maxWidth="xs">
      <DialogContent>
        <Stack
          spacing={1.5}
          sx={{
            alignItems: "center",
            textAlign: 'center',
            pt: 1
          }}>
          <CheckCircleIcon color="success" sx={{ fontSize: 56 }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {labels.attendanceMarked}
          </Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {text}
          </Typography>
        </Stack>
        <Stack sx={{ mt: 2 }}>
          <CompanionsChecklist title={labels.checkedInList} people={toPeople(result)} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          fullWidth
          onClick={onDone}
          sx={{ borderRadius: 999, fontWeight: 700 }}
        >
          {labels.confirmDone}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
