import { Alert, Box, Stack, Typography } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import RecipientCard from './RecipientCard';
import RecipientPicker from './RecipientPicker';
import SendMoneyConfirmDialog from './SendMoneyConfirmDialog';
import SendMoneyFields from './SendMoneyFields';
import { SEND_MONEY_CATEGORIES } from './queries';
import { useSendMoneyForm } from './useSendMoneyForm';

/**
 * Send Money: pay a person by hand — salary, a manual refund, a reimbursement,
 * an adjustment — to one of the bank accounts Duncit has verified for them.
 *
 * Choosing a person shows who they are and their verified accounts; the amount,
 * category, reason and notes follow; a confirmation repeats it all back before
 * anything moves. The server re-checks permission, the account and the amount,
 * and records the transfer in Send Money Logs and the audit trail.
 */
export default function SendMoneyPage() {
  const { t } = useTranslation();
  const m = useSendMoneyForm();
  const { control, register, formState, setValue } = m.form;
  const { errors } = formState;

  return (
    <Box>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 3 }}>
        <SendIcon color="primary" sx={{ fontSize: 28 }} />
        <Box>
          <Typography component="h1" variant="h5" sx={{ fontWeight: 700 }}>
            {t('finance.payouts.sendMoneyTitle')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('finance.payouts.sendMoneySubtitle')}
          </Typography>
        </Box>
      </Stack>

      <Stack component="form" spacing={3} noValidate onSubmit={m.review} sx={{ maxWidth: 720 }}>
        {m.options && !m.options.payouts_configured ? (
          <Alert severity="warning">{t('finance.payouts.notConfigured')}</Alert>
        ) : null}

        <RecipientPicker
          value={m.recipientOption}
          onChange={m.chooseRecipient}
          error={errors.recipient_user_id?.message}
          disabled={m.sending}
        />

        {m.recipient ? (
          <RecipientCard
            recipient={m.recipient}
            accountId={m.form.watch('account_id')}
            onAccountChange={(id) => setValue('account_id', id, { shouldValidate: true })}
            error={errors.account_id?.message}
          />
        ) : null}

        <SendMoneyFields
          control={control}
          register={register}
          errors={errors}
          categories={m.options?.categories ?? [...SEND_MONEY_CATEGORIES]}
          currencySymbol={m.options?.currency_symbol ?? ''}
          chooseMethod={m.account?.payout_method !== 'UPI'}
          disabled={m.sending}
        />

        <Box>
          <DuncitButton type="submit" variant="contained" disabled={!m.canSend || m.sending || m.loadingRecipient}>
            {t('finance.payouts.sendMoneyButton')}
          </DuncitButton>
        </Box>
      </Stack>

      <SendMoneyConfirmDialog
        open={m.confirming}
        recipient={m.recipient}
        account={m.account}
        values={m.values}
        busy={m.sending}
        onClose={m.cancelConfirm}
        onConfirm={m.confirm}
      />
    </Box>
  );
}
