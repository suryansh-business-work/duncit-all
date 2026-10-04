import {
  Alert,
  Box,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import RefundPartAccordion from './RefundPartAccordion';
import { buildRefundSections, paidVia } from './refundParts';
import { BACKOUT_STATUS_LABELS, type BackoutRefundRequest, type RefundPart } from './queries';

interface Props {
  refundFor: BackoutRefundRequest | null;
  sym: string;
  deductionPct: number;
  busy: boolean;
  onClose: () => void;
  /** Receives the dialog's (non-null) row and the part to process, so the
   * caller needs no null guard. */
  onConfirm: (row: BackoutRefundRequest, part: RefundPart) => void;
}

/** Refund breakup for a Spot Filled Backout request — how the booking was paid
 * (gateway money, Duncit Coins, or both) and what is taken back of the coins it
 * earned, one accordion box per part, each processed on its own through
 * processBackoutRefund. */
export default function RefundBreakupDialog({
  refundFor,
  sym,
  deductionPct,
  busy,
  onClose,
  onConfirm,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const sections = refundFor ? buildRefundSections(refundFor, sym, deductionPct, t) : [];
  return (
    <Dialog open={!!refundFor} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="refund-breakup-title">
      {refundFor && (
        <>
          <DialogTitle id="refund-breakup-title">{t('finance.backoutRefund.refundBreakup')}</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={1.5}>
              <Typography variant="body2">
                {t('finance.backoutRefund.refundFor', {
                  vars: {
                    name: refundFor.user_name ?? t('finance.backoutRefund.thisMember'),
                    no: refundFor.backout_no,
                  },
                })}
              </Typography>
              <Box sx={{ bgcolor: 'action.hover', borderRadius: 2, p: 1.5 }}>
                <Stack spacing={1}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1 }}>
                    <Typography variant="body2">{t('finance.backoutRefund.backoutStatus')}</Typography>
                    <Typography variant="body2">{BACKOUT_STATUS_LABELS[refundFor.backout_status]}</Typography>
                  </Stack>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2">{t('finance.backoutRefund.paidVia')}</Typography>
                    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {paidVia(sections).map((method) => (
                        <Chip key={method} size="small" label={method} />
                      ))}
                    </Stack>
                  </Stack>
                </Stack>
              </Box>
              <Box>
                {sections.map((section) => (
                  <RefundPartAccordion
                    key={section.part}
                    section={section}
                    busy={busy}
                    onProcess={(part) => onConfirm(refundFor, part)}
                  />
                ))}
              </Box>
              <Alert severity="info">{t('finance.backoutRefund.refundPartsInfo')}</Alert>
            </Stack>
          </DialogContent>
          <DialogActions>
            <DuncitButton onClick={onClose} disabled={busy}>
              {t('shell.common.close')}
            </DuncitButton>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
