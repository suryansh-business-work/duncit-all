import { Grid, MenuItem } from '@mui/material';
import { BANK_PAYOUT_METHODS, RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import type { Control, FieldValues, Path } from 'react-hook-form';

/**
 * Where a partner's money goes.
 *
 * A venue and a host store the SAME `BankAccountVerification` subdocument, so
 * the five fields and the method dropdown are written once here and each editor
 * passes the prefix its form holds them under (rule 34). The options come from
 * `BANK_PAYOUT_METHODS` in `@duncit/forms` — a dropdown offering a fourth value
 * is normalized back to '' by the server, which reads as an edit that did not
 * save.
 */
export interface PayoutFieldsProps<T extends FieldValues> {
  control: Control<T>;
  /** The object path holding the block, e.g. `bank_account`. */
  prefix: string;
}

export default function PayoutFields<T extends FieldValues>({
  control,
  prefix,
}: Readonly<PayoutFieldsProps<T>>) {
  const { t } = useTranslation();
  const field = (leaf: string) => `${prefix}.${leaf}` as Path<T>;

  return (
    <Grid container spacing={1.5}>
      <Grid size={{ xs: 12, md: 3 }}>
        <RhfTextField
          control={control}
          name={field('payout_method')}
          label={t('directory.venueEditor.payoutMethod')}
          size="small"
          select
        >
          <MenuItem value="">{t('directory.venueEditor.payoutNone')}</MenuItem>
          {BANK_PAYOUT_METHODS.map((method) => (
            <MenuItem key={method} value={method}>
              {method}
            </MenuItem>
          ))}
        </RhfTextField>
      </Grid>
      <Grid size={{ xs: 12, md: 3 }}>
        <RhfTextField
          control={control}
          name={field('account_holder_name')}
          label={t('directory.venueEditor.accountHolder')}
          size="small"
        />
      </Grid>
      <Grid size={{ xs: 12, md: 2 }}>
        <RhfTextField
          control={control}
          name={field('account_number')}
          label={t('directory.venueEditor.accountNumber')}
          size="small"
        />
      </Grid>
      <Grid size={{ xs: 12, md: 2 }}>
        <RhfTextField
          control={control}
          name={field('ifsc_code')}
          label={t('directory.venueEditor.ifsc')}
          size="small"
        />
      </Grid>
      <Grid size={{ xs: 12, md: 2 }}>
        <RhfTextField
          control={control}
          name={field('upi_id')}
          label={t('directory.venueEditor.upi')}
          size="small"
        />
      </Grid>
    </Grid>
  );
}
