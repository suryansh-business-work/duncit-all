import { Box, Chip, Divider, Stack, Typography } from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';
import { DuncitButton } from '@duncit/buttons';
import { InfoRow } from '@duncit/ui';
import { useTranslation, type DateFormatter } from '@duncit/app-settings';
import { labelOf } from '../failed-payments-page/labels';
import type { PaymentRefundEntry } from './queries';
import { REFUND_STATE_COLORS, refundSourceLabels, refundStatusLabels } from './refundLabels';
import { buildEntryLines } from './refundEntryLines';

interface Props {
  entry: PaymentRefundEntry;
  currencySymbol: string;
  formatDateTime: DateFormatter['formatDateTime'];
  /** Opens the Refund-to-source dialog for this row. Only offered when the server says it may be sent. */
  onRefund: (entry: PaymentRefundEntry) => void;
}

/**
 * One refund of a section: what it was for, where it stands, every id Razorpay
 * shows for it, and — only when the server marked it sendable — the Refund
 * button. The button is the server's call (`can_refund`), never worked out here:
 * a button beside money that is already on its way would refund it twice.
 */
export default function RefundEntryCard({ entry, currencySymbol, formatDateTime, onRefund }: Readonly<Props>) {
  const { t } = useTranslation();
  const lines = buildEntryLines(entry, { t, currencySymbol, formatDateTime });
  const heading = entry.ref ?? labelOf(refundSourceLabels(t), entry.source);
  const status = labelOf(refundStatusLabels(t), entry.status);

  return (
    <Box data-testid="payment-refund-entry" data-entry-state={entry.state}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1, flexWrap: 'wrap' }} useFlexGap>
        <Typography component="h4" variant="subtitle2" sx={{ fontWeight: 700, flex: 1, minWidth: 0, wordBreak: 'break-word' }}>
          {heading}
        </Typography>
        <Chip size="small" variant="outlined" color={REFUND_STATE_COLORS[entry.state]} label={status} />
      </Stack>
      <Stack spacing={1} divider={<Divider flexItem />}>
        {lines.map((line) => (
          <InfoRow key={line.label} variant="split" label={line.label} value={line.value} />
        ))}
      </Stack>
      {entry.can_refund && (
        <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 1.5 }}>
          <DuncitButton
            size="small"
            color="warning"
            variant="contained"
            startIcon={<UndoIcon />}
            data-testid="payment-refund-to-source"
            aria-label={t('finance.payment.refundArea.refundRowAria', { vars: { ref: heading } })}
            onClick={() => onRefund(entry)}
          >
            {t('finance.payment.refund')}
          </DuncitButton>
        </Stack>
      )}
    </Box>
  );
}
