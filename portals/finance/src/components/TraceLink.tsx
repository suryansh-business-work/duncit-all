import type { MouseEvent } from 'react';
import { Link as RouterLink } from 'react-router';
import { Link } from '@mui/material';
import type { PresentLabeledId } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import { paymentTracePath } from '../lib/paymentTrace';

interface Props {
  value: string;
  variant?: 'caption' | 'body2';
}

/** A link inside a clickable table row must not also open the row. */
const stopRowClick = (event: MouseEvent) => event.stopPropagation();

/**
 * One payment id as a link to Payment Trace, which lists every payment and log
 * the id appears in. Monospace like every id, and it breaks anywhere so a long
 * Razorpay id never pushes a card wider than the screen.
 */
export default function TraceLink({ value, variant = 'caption' }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Link
      component={RouterLink}
      to={paymentTracePath(value)}
      onClick={stopRowClick}
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
