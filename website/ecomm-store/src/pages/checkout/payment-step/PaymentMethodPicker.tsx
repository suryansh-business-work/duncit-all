import { useId } from 'react';
import { FormControl, FormControlLabel, FormHelperText, FormLabel, Radio, RadioGroup, Stack, Typography } from '@mui/material';

import { useStoreSettings } from '../../../app/providers/StoreSettingsProvider';
import type { StoreCheckoutMethod, StoreCheckoutQuote, StoreCodBlock } from '../../../graphql/cart';
import { useMoney } from '../../../lib/money';
import { useStoreT } from '../../../i18n';

const COD_BLOCK_KEYS: Record<StoreCodBlock, string> = {
  DISABLED: 'ecommStore.payment.codBlock.disabled',
  PRODUCT: 'ecommStore.payment.codBlock.product',
  PINCODE: 'ecommStore.payment.codBlock.pincode',
  MIN_ORDER: 'ecommStore.payment.codBlock.minOrder',
  MAX_ORDER: 'ecommStore.payment.codBlock.maxOrder',
  NOT_SERVICEABLE: 'ecommStore.payment.codBlock.notServiceable',
};

interface PickerProps {
  quote: StoreCheckoutQuote;
  method: StoreCheckoutMethod;
  onChange: (method: StoreCheckoutMethod) => void;
}

/** Pay online, or Cash on Delivery — with the reason when COD is not on offer. */
export function PaymentMethodPicker({ quote, method, onChange }: Readonly<PickerProps>) {
  const { t } = useStoreT();
  const money = useMoney();
  const settings = useStoreSettings();
  const labelId = useId();
  const codReason = quote.cod_block ? t(COD_BLOCK_KEYS[quote.cod_block]) : '';
  return (
    <FormControl>
      <FormLabel id={labelId} sx={{ fontWeight: 800, color: 'text.primary' }}>
        {t('ecommStore.payment.title')}
      </FormLabel>
      <RadioGroup aria-labelledby={labelId} value={method} onChange={(event) => onChange(event.target.value as StoreCheckoutMethod)}>
        <FormControlLabel
          value="ONLINE"
          control={<Radio />}
          label={
            <Stack>
              <Typography sx={{ fontWeight: 700 }}>{t('ecommStore.payment.online')}</Typography>
              {settings.prepaid_discount_pct > 0 ? (
                <Typography variant="caption" color="success.main">
                  {t('ecommStore.payment.prepaidOffer', { vars: { pct: settings.prepaid_discount_pct } })}
                </Typography>
              ) : null}
            </Stack>
          }
        />
        <FormControlLabel
          value="COD"
          disabled={!quote.cod_available}
          control={<Radio />}
          label={
            <Stack>
              <Typography sx={{ fontWeight: 700 }}>{t('ecommStore.payment.cod')}</Typography>
              {settings.cod_fee > 0 ? (
                <Typography variant="caption" color="text.secondary">
                  {t('ecommStore.payment.codFee', { vars: { fee: money(settings.cod_fee) } })}
                </Typography>
              ) : null}
            </Stack>
          }
        />
      </RadioGroup>
      {codReason ? <FormHelperText>{codReason}</FormHelperText> : null}
    </FormControl>
  );
}
