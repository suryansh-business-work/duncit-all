import { Link as RouterLink } from 'react-router';
import { Link } from '@mui/material';
import type { PresentLabeledId } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import { paymentTracePath } from '../lib/paymentTrace';

interface Props {
  value: string;
  variant?: 'caption' | 'body2';
}

/**
 * One payment id as a link to Payment Trace, which lists every payment and log
 * the id appears in. Monospace like every id, and it breaks anywhere so a long
 * Razorpay id never pushes a card wider than the screen. A table row ignores a
 * click that starts on a link (ROW_CLICK_IGNORE), so no handler is needed here.
 */
export default function TraceLink({ value, variant = 'caption' }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Link
      component={RouterLink}
      to={paymentTracePath(value)}
      variant={variant}
      aria-label={t('finance.paymentTrace.traceId', { vars: { id: value } })}
      data-testid="payment-trace-link"
      sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
    >
      {value}
    </Link>
  );
}

/** A detail line's id as a trace link; a missing id stays empty, so the line prints a dash. */
export const tracedId = (id: string | null | undefined) => (id ? <TraceLink value={id} variant="body2" /> : null);

/** `LabeledIds`' renderValue: every id in the cell becomes a trace link. */
export const traceIdValue = (id: PresentLabeledId) => <TraceLink value={id.value} />;
