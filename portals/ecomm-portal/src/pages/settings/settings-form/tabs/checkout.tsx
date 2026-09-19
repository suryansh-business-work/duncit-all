import type { Control } from 'react-hook-form';
import { Box, Divider, Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { z } from 'zod';
import RhfNumberField from '../../../../components/form/RhfNumberField';
import RhfSwitch from '../../../../components/form/RhfSwitch';
import { numberText, splitLines, toNumber, toOptionalInt } from '../../../../lib/format';
import { makeRules } from '../../../../lib/rules';
import type { Translate } from '../../../../lib/translate';
import type { SettingsTabSpec, StoreSettings } from '../settings.types';
import RazorpayAccountField from './RazorpayAccountField';

const PINCODE = /^\d{6}$/;
/** The server caps the prepaid discount at half the order. */
const PREPAID_MAX = 50;

const makeSchema = (t: Translate) => {
  const r = makeRules(t);
  return z.object({
    guest_checkout_enabled: z.boolean(),
    min_order_value: r.amount(),
    max_qty_per_line: r.whole().refine((value) => Number(value) >= 1, t('ecommPortal.settings.atLeastOne')),
    prepaid_discount_pct: r.percent(PREPAID_MAX),
    /** A Tech-portal Razorpay entry id, or '' for the default account. */
    razorpay_account: z.string(),
    cod_enabled: z.boolean(),
    cod_fee: r.amount(),
    cod_min_order: r.amount(),
    cod_max_order: r.amount(),
    cod_requires_otp: z.boolean(),
    cod_blocked_pincodes: z.string().refine((text) => splitLines(text).every((pin) => PINCODE.test(pin)), t('ecommPortal.settings.pincodeRule')),
  });
};

type CheckoutValues = z.infer<ReturnType<typeof makeSchema>>;

const toValues = (s: StoreSettings): CheckoutValues => ({
  guest_checkout_enabled: s.guest_checkout_enabled,
  min_order_value: numberText(s.min_order_value),
  max_qty_per_line: numberText(s.max_qty_per_line),
  prepaid_discount_pct: numberText(s.prepaid_discount_pct),
  razorpay_account: s.razorpay_account,
  cod_enabled: s.cod_enabled,
  cod_fee: numberText(s.cod_fee),
  cod_min_order: numberText(s.cod_min_order),
  cod_max_order: numberText(s.cod_max_order),
  cod_requires_otp: s.cod_requires_otp,
  cod_blocked_pincodes: s.cod_blocked_pincodes.join('\n'),
});

const toInput = (v: CheckoutValues) => ({
  guest_checkout_enabled: v.guest_checkout_enabled,
  min_order_value: toNumber(v.min_order_value),
  max_qty_per_line: toOptionalInt(v.max_qty_per_line) ?? 1,
  prepaid_discount_pct: toNumber(v.prepaid_discount_pct),
  razorpay_account: v.razorpay_account,
  cod_enabled: v.cod_enabled,
  cod_fee: toNumber(v.cod_fee),
  cod_min_order: toNumber(v.cod_min_order),
  cod_max_order: toNumber(v.cod_max_order),
  cod_requires_otp: v.cod_requires_otp,
  cod_blocked_pincodes: splitLines(v.cod_blocked_pincodes),
});

const twoColumns = { display: 'grid', columnGap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } };

function CheckoutFields({ control }: Readonly<{ control: Control<CheckoutValues> }>) {
  const { t } = useTranslation();
  const noLimit = t('ecommPortal.settings.zeroNoLimit');
  return (
    <Stack spacing={1}>
      <RhfSwitch control={control} name="guest_checkout_enabled" label={t('ecommPortal.settings.guestCheckout')} hint={t('ecommPortal.settings.guestCheckoutHint')} />
      <Box sx={twoColumns}>
        <RhfNumberField control={control} name="min_order_value" label={t('ecommPortal.settings.minOrder')} hint={noLimit} />
        <RhfNumberField control={control} name="max_qty_per_line" label={t('ecommPortal.settings.maxQty')} whole required />
        <RhfNumberField
          control={control}
          name="prepaid_discount_pct"
          label={t('ecommPortal.settings.prepaidDiscount')}
          hint={t('ecommPortal.settings.prepaidHint', { vars: { max: PREPAID_MAX } })}
          unit="%"
        />
      </Box>
      <Divider />
      <RazorpayAccountField control={control} name="razorpay_account" />
      <Divider />
      <RhfSwitch control={control} name="cod_enabled" label={t('ecommPortal.settings.codEnabled')} />
      <Box sx={twoColumns}>
        <RhfNumberField control={control} name="cod_fee" label={t('ecommPortal.orders.codFee')} />
        <RhfNumberField control={control} name="cod_min_order" label={t('ecommPortal.settings.codMin')} hint={noLimit} />
        <RhfNumberField control={control} name="cod_max_order" label={t('ecommPortal.settings.codMax')} hint={noLimit} />
      </Box>
      <RhfSwitch control={control} name="cod_requires_otp" label={t('ecommPortal.settings.codOtp')} hint={t('ecommPortal.settings.codOtpHint')} />
      <RhfTextField
        control={control}
        name="cod_blocked_pincodes"
        label={t('ecommPortal.settings.blockedPincodes')}
        hint={t('ecommPortal.settings.onePerLine')}
        multiline
        minRows={3}
      />
    </Stack>
  );
}

/** What checkout accepts: guests, order limits, the prepaid discount and cash on delivery. */
export const CHECKOUT_TAB: SettingsTabSpec<CheckoutValues> = { makeSchema, toValues, toInput, Fields: CheckoutFields };
