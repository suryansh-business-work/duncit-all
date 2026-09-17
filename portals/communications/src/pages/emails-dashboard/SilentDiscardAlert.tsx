import { Alert, AlertTitle } from '@mui/material';

/**
 * With no provider entry configured the transport accepts every message, throws
 * it away and returns success — the row still lands as SENT, in a couple of
 * milliseconds, which no real SMTP handshake manages. That makes a completely
 * broken mailbox look exactly like a healthy one, so this outranks every other
 * number on the page whenever it fires.
 *
 * It is a timing tell, not proof: a relay on the same host can answer that fast
 * too. The copy says what was measured and what it means IF no mailbox is
 * configured, rather than asserting a delivery failure it cannot see.
 */
export default function SilentDiscardAlert({ count }: Readonly<{ count: number }>) {
  if (count === 0) return null;
  return (
    <Alert severity="warning">
      <AlertTitle>
        {count} sends completed in under five milliseconds — the signature of a discarded send
      </AlertTitle>
      No mail server handshake is that fast. If no mailbox is configured under Environment, the
      no-provider transport accepted these and threw them away: nobody received anything, and
      every delivery number below is overstated by at least this much.
    </Alert>
  );
}
