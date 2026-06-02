import { Box, MenuItem, TextField } from '@mui/material';
import {
  BANK_PAYOUT_METHODS,
  type BankAccountValues,
} from '../forms/validation/bankAccount';

interface Props {
  value: BankAccountValues;
  onChange: (next: BankAccountValues) => void;
  errorFor?: (field: keyof BankAccountValues) => string | undefined;
}

export default function BankAccountVerificationSection({ value, onChange, errorFor }: Props) {
  const set = (patch: Partial<BankAccountValues>) => onChange({ ...value, ...patch });
  const isUpi = value.payout_method === 'UPI';
  const showBankRails = value.payout_method === 'IMPS' || value.payout_method === 'NEFT';

  return (
    <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
      <TextField
        select
        label="Payout method"
        size="small"
        value={value.payout_method}
        onChange={(event) => set({ payout_method: event.target.value as BankAccountValues['payout_method'] })}
        error={!!errorFor?.('payout_method')}
        helperText={errorFor?.('payout_method') || ' '}
        required
      >
        {BANK_PAYOUT_METHODS.map((method) => (
          <MenuItem key={method} value={method}>{method}</MenuItem>
        ))}
      </TextField>
      <TextField
        label="Account holder name"
        size="small"
        value={value.account_holder_name}
        onChange={(event) => set({ account_holder_name: event.target.value })}
        error={!!errorFor?.('account_holder_name')}
        helperText={errorFor?.('account_holder_name') || ' '}
        required
      />
      {isUpi && (
        <TextField
          label="UPI ID"
          size="small"
          value={value.upi_id}
          onChange={(event) => set({ upi_id: event.target.value })}
          error={!!errorFor?.('upi_id')}
          helperText={errorFor?.('upi_id') || ' '}
          required
        />
      )}
      {showBankRails && (
        <>
          <TextField
            label="Account number"
            size="small"
            value={value.account_number}
            onChange={(event) => set({ account_number: event.target.value })}
            error={!!errorFor?.('account_number')}
            helperText={errorFor?.('account_number') || ' '}
            required
          />
          <TextField
            label="IFSC code"
            size="small"
            value={value.ifsc_code}
            onChange={(event) => set({ ifsc_code: event.target.value.toUpperCase() })}
            error={!!errorFor?.('ifsc_code')}
            helperText={errorFor?.('ifsc_code') || ' '}
            required
          />
        </>
      )}
    </Box>
  );
}