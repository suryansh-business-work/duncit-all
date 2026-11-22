import { Alert, Box, Chip, FormControl, FormControlLabel, FormHelperText, FormLabel, Radio, RadioGroup, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { maskAccountNumber } from '../withdrawals-page/account-details';
import type { Recipient, VerifiedAccount } from './queries';

interface Props {
  recipient: Recipient;
  accountId: string;
  onAccountChange: (accountId: string) => void;
  error?: string;
}

/** One verified account, with the account number masked to its last four digits. */
const accountLine = (account: VerifiedAccount) =>
  account.payout_method === 'UPI'
    ? account.upi_id
    : `${maskAccountNumber(account.account_number)} · ${account.ifsc_code}`;

/**
 * The person Finance is about to pay: who they are, and the bank accounts Duncit
 * has VERIFIED for them. Only those can be chosen — the destination is never
 * typed — and a person with none cannot be paid from here at all.
 */
export default function RecipientCard({ recipient, accountId, onAccountChange, error }: Readonly<Props>) {
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
        <Alert severity="warning">{t('finance.payouts.noVerifiedAccount')}</Alert>
      ) : (
        <FormControl error={!!error} fullWidth>
          <FormLabel id="send-money-account-label">{t('finance.payouts.verifiedAccounts')}</FormLabel>
          <RadioGroup
            aria-labelledby="send-money-account-label"
            value={accountId}
            onChange={(event) => onAccountChange(event.target.value)}
          >
            {accounts.map((account) => (
              <FormControlLabel
                key={account.id}
                value={account.id}
                control={<Radio />}
                label={
                  <Stack component="span" sx={{ lineHeight: 1.3 }}>
                    <Typography variant="body2" component="span" sx={{ fontFamily: 'monospace' }}>
                      {accountLine(account)}
                    </Typography>
                    <Typography variant="caption" component="span" sx={{ color: 'text.secondary' }}>
                      {[account.account_holder_name, account.label].filter(Boolean).join(' · ')}
                    </Typography>
                  </Stack>
                }
              />
            ))}
          </RadioGroup>
          <Chip size="small" color="success" label={t('finance.payouts.verifiedAccount')} sx={{ alignSelf: 'flex-start', mt: 0.5 }} />
          {error ? <FormHelperText>{error}</FormHelperText> : null}
        </FormControl>
      )}
    </Box>
  );
}
