import type { Control } from 'react-hook-form';
import { Box } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { z } from 'zod';
import RhfNumberField from '../../../../components/form/RhfNumberField';
import { numberText, toNumber } from '../../../../lib/format';
import { makeRules } from '../../../../lib/rules';
import type { Translate } from '../../../../lib/translate';
import type { SettingsTabSpec, StoreSettings } from '../settings.types';

const makeSchema = (t: Translate) => {
  const r = makeRules(t);
  return z.object({ free_shipping_above: r.amount(), flat_shipping_fee: r.amount() });
};

type ShippingValues = z.infer<ReturnType<typeof makeSchema>>;

const toValues = (s: StoreSettings): ShippingValues => ({
  free_shipping_above: numberText(s.free_shipping_above),
  flat_shipping_fee: numberText(s.flat_shipping_fee),
});

const toInput = (v: ShippingValues) => ({
  free_shipping_above: toNumber(v.free_shipping_above),
  flat_shipping_fee: toNumber(v.flat_shipping_fee),
});

function ShippingFields({ control }: Readonly<{ control: Control<ShippingValues> }>) {
  const { t } = useTranslation();
  return (
    <Box sx={{ display: 'grid', columnGap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
      <RhfNumberField
        control={control}
        name="free_shipping_above"
        label={t('ecommPortal.settings.freeShippingAbove')}
        hint={t('ecommPortal.settings.freeShippingHint')}
      />
      <RhfNumberField
        control={control}
        name="flat_shipping_fee"
        label={t('ecommPortal.settings.flatFee')}
        hint={t('ecommPortal.settings.flatFeeHint')}
      />
    </Box>
  );
}

/** What delivery costs the buyer. */
export const SHIPPING_TAB: SettingsTabSpec<ShippingValues> = { makeSchema, toValues, toInput, Fields: ShippingFields };
