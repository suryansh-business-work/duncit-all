import { useState } from 'react';
import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, TextField, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { ConfirmDialog } from '@duncit/dialogs';
import { StatusChip } from '@duncit/ui';
import { formatMoney } from '@duncit/utils';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import type { PodShopReturnRow } from './queries';
import { RETURN_STATUS_COLORS, returnItemsText } from './returnColumns';
import { useReturnActions, type ReturnAction } from './useReturnActions';

interface Props {
  row: PodShopReturnRow | null;
  onClose: () => void;
  onChanged: () => void;
}

/** One return: what is coming back and why, where the parcel is, the money — and the next step. */
export default function ReturnDetailDialog({ row, onClose, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const [note, setNote] = useState('');
  const [noteMissing, setNoteMissing] = useState(false);
  const [confirmRefund, setConfirmRefund] = useState(false);
  const { run, busy } = useReturnActions(onChanged);
  if (!row) return null;

  const act = async (action: ReturnAction) => {
    if (action === 'reject' && !note.trim()) {
      setNoteMissing(true);
      return;
    }
    if (await run(action, row.id, note.trim())) {
      setNote('');
      setConfirmRefund(false);
      onClose();
    }
  };
  const fact = (label: string, value: string) => (
    <Typography variant="body2">
      <strong>{label}:</strong> {value || '—'}
    </Typography>
  );
  const s = row.status;
  const coinsBack = row.refund.coins ? ` + ${row.refund.coins}` : '';
  const refundText = `${row.refund.status} · ${formatMoney(row.refund.amount, { decimals: 2 })}${coinsBack}`;
  const waitingForGoods = s === 'APPROVED' || s === 'PICKUP_SCHEDULED';

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="return-detail-title">
      <DialogTitle id="return-detail-title">{t('products.returns.detailTitle', { vars: { no: row.return_no } })}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <StatusChip status={s} label={t(`products.returns.status.${s}`)} colorMap={RETURN_STATUS_COLORS} />
          {fact(t('products.returns.colOrder'), row.order_no)}
          {fact(t('products.returns.colBuyer'), `${row.buyer_name} · ${row.buyer_email}`)}
          {fact(t('products.returns.colItems'), returnItemsText(row))}
          {fact(t('products.returns.colValue'), formatMoney(row.gross, { decimals: 2 }))}
          {fact(t('products.returns.reason'), row.reason)}
          {row.comments && fact(t('products.returns.comments'), row.comments)}
          {row.decision_note && fact(t('products.returns.decisionNote'), row.decision_note)}
          {row.pickup.awb && fact(t('products.returns.colPickup'), `${row.pickup.courier_name} · ${row.pickup.awb} · ${row.pickup.tracking_status || row.pickup.status}`)}
          {row.pickup.last_error && <Alert severity="error">{t('products.returns.pickupFailed', { vars: { error: row.pickup.last_error } })}</Alert>}
          {row.refund.status !== 'NONE' &&
            fact(t('products.returns.refund'), refundText)}
          {row.refund.status === 'FAILED' && <Alert severity="error">{t('products.returns.refundFailed', { vars: { error: row.refund.error } })}</Alert>}
          <Divider />
          <Typography component="h3" variant="subtitle2" sx={{ fontWeight: 700 }}>
            {t('products.returns.history')}
          </Typography>
          {row.events.map((e) => (
            <Typography key={`${e.at}-${e.status}`} variant="body2">
              {formatDateTime(e.at)} · {t(`products.returns.status.${e.status}`)} · {e.by}
              {e.note ? ` — ${e.note}` : ''}
            </Typography>
          ))}
          {s === 'REQUESTED' && (
            <TextField
              label={t('products.returns.note')}
              value={note}
              onChange={(event) => {
                setNote(event.target.value);
                setNoteMissing(false);
              }}
              multiline
              minRows={2}
              error={noteMissing}
              helperText={noteMissing ? t('products.returns.rejectNeedsNote') : t('products.returns.noteHint')}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
        <DuncitButton onClick={onClose}>{t('shell.common.close')}</DuncitButton>
        {s === 'REQUESTED' && (
          <>
            <DuncitButton color="error" variant="outlined" loading={busy} onClick={() => act('reject')}>
              {t('products.returns.reject')}
            </DuncitButton>
            <DuncitButton variant="contained" loading={busy} onClick={() => act('approve')}>
              {t('products.returns.approve')}
            </DuncitButton>
          </>
        )}
        {s === 'APPROVED' && row.pickup.last_error && (
          <DuncitButton variant="outlined" loading={busy} onClick={() => act('retryPickup')}>
            {t('products.returns.retryPickup')}
          </DuncitButton>
        )}
        {waitingForGoods && (
          <DuncitButton variant="outlined" loading={busy} onClick={() => act('received')}>
            {t('products.returns.markReceived')}
          </DuncitButton>
        )}
        {s === 'RECEIVED' && (
          <DuncitButton variant="contained" loading={busy} onClick={() => setConfirmRefund(true)}>
            {t('products.returns.refundBuyer')}
          </DuncitButton>
        )}
        {row.refund.status === 'FAILED' && (
          <DuncitButton variant="outlined" color="error" loading={busy} onClick={() => act('retryRefund')}>
            {t('products.returns.retryRefund')}
          </DuncitButton>
        )}
      </DialogActions>
      <ConfirmDialog
        open={confirmRefund}
        title={t('products.returns.refundConfirmTitle')}
        message={t('products.returns.refundConfirmBody', { vars: { amount: formatMoney(row.gross, { decimals: 2 }) } })}
        confirmLabel={t('products.returns.refundBuyer')}
        loading={busy}
        onClose={() => setConfirmRefund(false)}
        onConfirm={() => act('refund')}
      />
    </Dialog>
  );
}
