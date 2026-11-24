import { Alert, Box, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { formatMoney } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { categoryLabel } from './categories';
import type { Recipient, VerifiedAccount } from './queries';
import { CUSTOM_ACCOUNT_ID, type SendMoneyFormValues } from './send-money.schema';

interface Props {
  open: boolean;
  recipient: Recipient | null;
  account: VerifiedAccount | null;
  values: SendMoneyFormValues | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

function Line({ label, children }: Readonly<{ label: string; children: string }>) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>
        {children}
      </Typography>
    </Box>
  );
}

/** The destination exactly as it will be paid: the UPI address, or holder, account number and IFSC in full. */
const destinationOf = (account: VerifiedAccount, method: SendMoneyFormValues['payout_method']) => {
  if (account.payout_method === 'UPI') return `UPI · ${account.upi_id}`;
  // A typed account carries its own method; the form's IMPS/NEFT choice is for verified ones.
  const sentBy = account.source === CUSTOM_ACCOUNT_ID ? account.payout_method : method;
  return [sentBy, account.account_holder_name, account.account_number, account.ifsc_code].filter(Boolean).join(' · ');
};

/**
 * The last look before money leaves: who, to which account, how much, and why.
 *
 * Money does not move until the button here is pressed, and even then the server
 * re-checks everything — this dialog repeats the form back so a wrong digit or a
 * wrong person is caught by a person, not discovered in a bank statement.
 */
export default function SendMoneyConfirmDialog({ open, recipient, account, values, busy, onClose, onConfirm }: Readonly<Props>) {
  const { t } = useTranslation();
  const ready = recipient && account && values;
  return (
    <Dialog open={open && !!ready} onClose={busy ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t('finance.payouts.confirmSendTitle')}</DialogTitle>
      <DialogContent dividers>
        {ready ? (
          <Stack spacing={1.5}>
            <Typography variant="body2">{t('finance.payouts.confirmSendIntro')}</Typography>
            <Line label={t('finance.payouts.recipient')}>{`${recipient.name} (${recipient.email})`}</Line>
            <Line label={t('finance.payouts.payTo')}>{destinationOf(account, values.payout_method)}</Line>
            {account.source === CUSTOM_ACCOUNT_ID ? <Alert severity="warning">{t('finance.payouts.customAccountConfirmNote')}</Alert> : null}
            <Line label={t('finance.common.amount')}>{formatMoney(Number(values.amount), { decimals: 2 })}</Line>
            <Line label={t('finance.payouts.category')}>{categoryLabel(t, values.category)}</Line>
            <Line label={t('finance.common.reason')}>{values.reason}</Line>
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} disabled={busy}>
          {t('shell.common.cancel')}
        </DuncitButton>
        <DuncitButton variant="contained" onClick={onConfirm} disabled={busy}>
          {t('finance.payouts.sendMoneyButton')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
