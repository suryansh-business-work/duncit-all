import type { Control } from 'react-hook-form';
import { Alert, Box, FormControl, FormControlLabel, FormHelperText, FormLabel, Radio, RadioGroup, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { maskAccountNumber } from '../withdrawals-page/account-details';
import CustomAccountFields from './CustomAccountFields';
import type { Recipient, VerifiedAccount } from './queries';
import { CUSTOM_ACCOUNT_ID, type SendMoneyFormValues } from './send-money.schema';

interface Props {
  recipient: Recipient;
  accountId: string;
  onAccountChange: (accountId: string) => void;
  control: Control<SendMoneyFormValues>;
  error?: string;
  disabled: boolean;
}

/** One verified account, with the account number masked to its last four digits. */
const accountLine = (account: VerifiedAccount) =>
  account.payout_method === 'UPI'
    ? account.upi_id
    : `${maskAccountNumber(account.account_number)} · ${account.ifsc_code}`;

function AccountLabel({ line, caption }: Readonly<{ line: string; caption: string }>) {
  return (
    <Stack component="span" sx={{ lineHeight: 1.3 }}>
      <Typography variant="body2" component="span" sx={{ fontFamily: 'monospace' }}>
        {line}
      </Typography>
      <Typography variant="caption" component="span" sx={{ color: 'text.secondary' }}>
        {caption}
      </Typography>
    </Stack>
  );
}

/**
 * The person Finance is about to pay: who they are, the bank accounts Duncit has
 * VERIFIED for them, and — always last — the option to type another account or
 * UPI ID in for this one payment. A verified account is the default whenever
 * there is one; a typed account has to be checked and acknowledged.
 */
export default function RecipientCard({ recipient, accountId, onAccountChange, control, error, disabled }: Readonly<Props>) {
  const { t } = useTranslation();
  const accounts = recipient.verified_accounts;
  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}>
      <Stack spacing={0.25} sx={{ mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {recipient.name}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {[recipient.email, recipient.phone].filter(Boolean).join(' · ')}
        </Typography>
      </Stack>
      {accounts.length === 0 ? (
        <Alert severity="info" sx={{ mb: 1.5 }}>
          {t('finance.payouts.noVerifiedAccount')}
        </Alert>
      ) : null}
      <FormControl error={!!error} fullWidth>
        <FormLabel id="send-money-account-label">{t('finance.payouts.payTo')}</FormLabel>
        <RadioGroup aria-labelledby="send-money-account-label" value={accountId} onChange={(event) => onAccountChange(event.target.value)}>
          {accounts.length > 0 ? (
            <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 700, mt: 1 }}>
              {t('finance.payouts.verifiedAccounts')}
            </Typography>
          ) : null}
          {accounts.map((account) => (
            <FormControlLabel
              key={account.id}
              value={account.id}
              disabled={disabled}
              control={<Radio />}
              label={
                <AccountLabel
                  line={accountLine(account)}
                  caption={[t('finance.payouts.verifiedAccount'), account.account_holder_name, account.label].filter(Boolean).join(' · ')}
                />
              }
            />
          ))}
          <FormControlLabel
            value={CUSTOM_ACCOUNT_ID}
            disabled={disabled}
            control={<Radio />}
            label={<AccountLabel line={t('finance.payouts.customAccountOption')} caption={t('finance.payouts.customAccountOptionHelp')} />}
          />
        </RadioGroup>
        {error ? <FormHelperText>{error}</FormHelperText> : null}
      </FormControl>
      {accountId === CUSTOM_ACCOUNT_ID ? <CustomAccountFields control={control} disabled={disabled} /> : null}
    </Box>
  );
}
