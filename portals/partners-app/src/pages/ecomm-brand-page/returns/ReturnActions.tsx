import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { ConfirmDialog } from '@duncit/dialogs';
import { fireAndForget, logs } from '@duncit/logs';
import { formatMoney } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import { ReturnDecisionForm, type ReturnDecision, type ReturnDecisionValues } from './return-decision';
import { useReturnActions } from './useReturnActions';
import type { ReturnRow } from './returns.queries';

interface Props {
  row: ReturnRow;
  onUpdated: (row: ReturnRow) => void;
}

const DECISION_TITLE_ID = 'return-decision-title';
const RETURNS_LOGGER = logs.portal['partners-app'];

/** What the brand can do next with a return — only the steps its status allows. */
export default function ReturnActions({ row, onUpdated }: Readonly<Props>) {
  const { t } = useTranslation();
  const { run, busy } = useReturnActions(onUpdated);
  const [decision, setDecision] = useState<ReturnDecision | null>(null);
  const [refundOpen, setRefundOpen] = useState(false);
  const { status } = row;
  const awaitingGoods = status === 'APPROVED' || status === 'PICKUP_SCHEDULED';
  const act = (action: 'retryPickup' | 'received' | 'retryRefund') => fireAndForget(run(action, row.id), RETURNS_LOGGER, 'ReturnActions', action);

  const decide = async (values: ReturnDecisionValues) => {
    if (!decision) return;
    const note = values.note.trim();
    const done = await run(decision, row.id, decision === 'reject' ? note : note || null);
    if (done) setDecision(null);
  };

  const refund = async () => {
    await run('refund', row.id);
    setRefundOpen(false);
  };

  return (
    <>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        {status === 'REQUESTED' && (
          <>
            <DuncitButton variant="contained" onClick={() => setDecision('approve')} data-testid="return-approve">
              {t('partners.returns.approve')}
            </DuncitButton>
            <DuncitButton variant="outlined" color="error" onClick={() => setDecision('reject')} data-testid="return-reject">
              {t('partners.returns.reject')}
            </DuncitButton>
          </>
        )}
        {status === 'APPROVED' && Boolean(row.pickup.last_error) && (
          <DuncitButton variant="outlined" loading={busy === 'retryPickup'} onClick={() => act('retryPickup')} data-testid="return-retry-pickup">
            {t('partners.returns.retryPickup')}
          </DuncitButton>
        )}
        {awaitingGoods && (
          <DuncitButton variant="outlined" loading={busy === 'received'} onClick={() => act('received')} data-testid="return-received">
            {t('partners.returns.markReceived')}
          </DuncitButton>
        )}
        {status === 'RECEIVED' && (
          <DuncitButton variant="contained" onClick={() => setRefundOpen(true)} data-testid="return-refund">
            {t('partners.returns.refundBuyer')}
          </DuncitButton>
        )}
        {row.refund.status === 'FAILED' && (
          <DuncitButton variant="outlined" loading={busy === 'retryRefund'} onClick={() => act('retryRefund')} data-testid="return-retry-refund">
            {t('partners.returns.retryRefund')}
          </DuncitButton>
        )}
      </Stack>
      <Dialog open={Boolean(decision)} onClose={busy ? undefined : () => setDecision(null)} fullWidth maxWidth="xs" aria-labelledby={DECISION_TITLE_ID}>
        <DialogTitle id={DECISION_TITLE_ID}>
          {decision === 'reject' ? t('partners.returns.rejectTitle', { vars: { no: row.return_no } }) : t('partners.returns.approveTitle', { vars: { no: row.return_no } })}
        </DialogTitle>
        <DialogContent>
          {decision && (
            <ReturnDecisionForm decision={decision} busy={busy === decision} onSubmit={(values) => fireAndForget(decide(values), RETURNS_LOGGER, 'ReturnActions', 'decide')} onCancel={() => setDecision(null)} />
          )}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={refundOpen}
        title={t('partners.returns.refundConfirmTitle', { vars: { no: row.return_no } })}
        message={t('partners.returns.refundConfirmBody', { vars: { amount: formatMoney(row.gross, { decimals: 2 }) } })}
        confirmLabel={t('partners.returns.refundBuyer')}
        busy={busy === 'refund'}
        onConfirm={() => fireAndForget(refund(), RETURNS_LOGGER, 'ReturnActions', 'refund')}
        onClose={() => setRefundOpen(false)}
      />
    </>
  );
}
