import { Spinner, Text } from 'tamagui';

import { fireAndForget } from '@/utils/fire-and-forget';
import { CompanionsChecklist } from '../CompanionsChecklist';
import { CompanionsForm } from '../CompanionsForm';
import { ScannedAttendeeCard } from '../ScannedAttendeeCard';
import { ScannerFrame } from '../ScannerFrame';
import { companionLine, reservedPhones, resultTone } from './scanHelpers';
import type { HostTicketScanResult } from '../scan.types';
import type { ScanTarget } from './types';
import type { useTicketScan } from './useTicketScan';

interface TicketScanBodyProps {
  pod: ScanTarget | null;
  scan: ReturnType<typeof useTicketScan>;
  attendee: NonNullable<HostTicketScanResult['attendee']> | null;
  recorded: HostTicketScanResult['companions'];
  confirmation: string;
  onOpenProfile: (userId: string) => void;
}

/** The scroll pane: scanner, the scan's message, the attendee, the group's
 * roster and — when the ticket needs it — the companions form. */
export function TicketScanBody({
  pod,
  scan,
  confirmation,
  attendee,
  recorded,
  onOpenProfile,
}: Readonly<TicketScanBodyProps>) {
  const { t, busy, result, error, permission, pendingToken, submit } = scan;
  return (
    <>
      {busy ? (
        <Spinner
          role="progressbar"
          aria-label={t('mweb.a11y.loading')}
          testID="ticket-scan-busy"
          color="$primary"
        />
      ) : null}

      {!result && !busy ? (
        <ScannerFrame
          granted={!!permission?.granted}
          scanning={!!pod}
          onCode={(token) => fireAndForget(submit(token))}
        />
      ) : null}

      {error ? (
        <Text role="alert" testID="ticket-scan-error" fontSize={13} color="$danger">
          {error}
        </Text>
      ) : null}

      {/* "Add the other person" is an INSTRUCTION, not a failure —
          colouring it red made a working scan look broken, and the
          form below it was missed entirely. mWeb reads the same. */}
      {result ? (
        <Text
          testID="ticket-scan-message"
          fontSize={14}
          fontWeight="600"
          color={resultTone(result)}
        >
          {result.ok ? confirmation : result.message}
        </Text>
      ) : null}

      {attendee ? (
        <ScannedAttendeeCard
          attendee={attendee}
          alreadyCheckedIn={!!result?.already_checked_in}
          pending={!!result?.requires_companions}
          ticketCode={result?.ticket?.ticket_code}
          seats={result?.ticket?.seats ?? 1}
          onOpenProfile={() => onOpenProfile(attendee.user_id)}
        />
      ) : null}

      {recorded.length > 0 ? (
        <CompanionsChecklist
          title={t('mweb.hostScan.checkedInList')}
          people={recorded.map((companion) => ({
            key: `${companion.phone_number}-${companion.name}`,
            primary: companion.name,
            secondary: companionLine(companion, t('mweb.hostScan.companionVerified')),
          }))}
        />
      ) : null}

      {result?.requires_companions && pendingToken && result.ticket ? (
        <CompanionsForm
          /* Keyed on the booking: the form sizes its rows from
             companions_required once, at mount. A different
             ticket must therefore get a different form, while a
             re-scan of the SAME one keeps what the host typed. */
          key={result.ticket.membership_id}
          podId={pod?.id ?? ''}
          membershipId={result.ticket.membership_id}
          seats={result.ticket.seats ?? 1}
          required={result.companions_required}
          reserved={reservedPhones(result)}
          busy={busy}
          onSubmit={(companions) => fireAndForget(submit(pendingToken, companions))}
        />
      ) : null}
    </>
  );
}
