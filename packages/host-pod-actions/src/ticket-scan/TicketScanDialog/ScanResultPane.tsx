import { Alert } from '@mui/material';
import CompanionsChecklist from '../CompanionsChecklist';
import CompanionsForm from '../CompanionsForm';
import ScannedAttendeeCard from '../ScannedAttendeeCard';
import { companionLine, confirmationText, reservedPhones, resultSeverity } from './scan-result';
import type { HostPodActionLabels } from '../../labels';
import type { HostTicketScanResult, PodCompanionInput, PodCompanionRecord } from '../../types';

interface Props {
  result: HostTicketScanResult;
  /** Everyone this booking has accounted for — companions are on file even in
   * the collecting state (a partially-recorded group renders its ticks). */
  recorded: PodCompanionRecord[];
  podId: string;
  /** The token of the ticket on screen, so the group's details re-scan it. */
  pendingToken: string | null;
  busy: boolean;
  labels: HostPodActionLabels;
  onCompanions: (token: string, companions: PodCompanionInput[]) => void;
}

/** What a scan came back with: the verdict, who it was, and — for a group
 * ticket — the people already recorded and the form for the rest. */
export default function ScanResultPane({
  result,
  recorded,
  podId,
  pendingToken,
  busy,
  labels,
  onCompanions,
}: Readonly<Props>) {
  return (
    <>
      {/* "Add the other person" is an INSTRUCTION, not a failure. Showing
          it in red read as "the scan broke", and with the attendee card
          between it and the form in an xs dialog, the form below was
          missed entirely — reported as "nothing happens". */}
      <Alert severity={resultSeverity(result)} data-testid="ticket-scan-message">
        {result.ok ? confirmationText(result, labels) : result.message}
      </Alert>
      {result.attendee && (
        <ScannedAttendeeCard
          attendee={result.attendee}
          alreadyCheckedIn={result.already_checked_in}
          pending={result.requires_companions}
          ticketCode={result.ticket?.ticket_code}
          seats={result.ticket?.seats ?? 1}
        />
      )}
      {recorded.length > 0 && (
        <CompanionsChecklist
          title={labels.checkedInList}
          people={recorded.map((companion) => ({
            key: `${companion.phone_number}-${companion.name}`,
            primary: companion.name,
            secondary: companionLine(companion, labels),
          }))}
        />
      )}
      {result.requires_companions && pendingToken && result.ticket && (
        <CompanionsForm
          /* Keyed on the booking: the form sizes its rows from
             companions_required once, at mount. A different ticket
             must therefore get a different form, while a re-scan of
             the SAME one keeps what the host has already typed. */
          key={result.ticket.membership_id}
          podId={podId}
          membershipId={result.ticket.membership_id}
          seats={result.ticket.seats ?? 1}
          required={result.companions_required}
          reserved={reservedPhones(result)}
          busy={busy}
          onSubmit={(companions) => onCompanions(pendingToken, companions)}
        />
      )}
    </>
  );
}
