import { useWatch, type Control } from 'react-hook-form';
import { Box, Divider, Stack, Typography } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { z } from 'zod';
import RhfNumberField from '../../../../components/form/RhfNumberField';
import RhfSwitch from '../../../../components/form/RhfSwitch';
import { numberText, splitLines, toNumber } from '../../../../lib/format';
import { TWO_COLUMNS } from '../../../../lib/layout';
import { makeRules } from '../../../../lib/rules';
import type { Translate } from '../../../../lib/translate';
import type { SettingsTabSpec, StoreSettings } from '../settings.types';

const PINCODE = /^\d{6}$/;

const makeSchema = (t: Translate) => {
  const r = makeRules(t);
  return z.object({
    free_shipping_above: r.amount(),
    flat_shipping_fee: r.amount(),
    serviceable_pincodes_enabled: z.boolean(),
    serviceable_pincodes: z
      .string()
      .refine((text) => splitLines(text).every((pin) => PINCODE.test(pin)), t('ecommPortal.settings.pincodeRule')),
  });
};

type ShippingValues = z.infer<ReturnType<typeof makeSchema>>;

const toValues = (s: StoreSettings): ShippingValues => ({
  free_shipping_above: numberText(s.free_shipping_above),
  flat_shipping_fee: numberText(s.flat_shipping_fee),
  serviceable_pincodes_enabled: s.serviceable_pincodes_enabled,
  serviceable_pincodes: s.serviceable_pincodes.join('\n'),
});

const toInput = (v: ShippingValues) => ({
  free_shipping_above: toNumber(v.free_shipping_above),
  flat_shipping_fee: toNumber(v.flat_shipping_fee),
  serviceable_pincodes_enabled: v.serviceable_pincodes_enabled,
  serviceable_pincodes: splitLines(v.serviceable_pincodes),
});

/** How many pincodes the list holds right now, as it is typed. */
function ServiceableCount({ control }: Readonly<{ control: Control<ShippingValues> }>) {
  const { t } = useTranslation();
  const text = useWatch({ control, name: 'serviceable_pincodes' });
  const count = splitLines(text).length;
  return (
    <Typography variant="caption" role="status" sx={{ color: 'text.secondary' }} data-testid="settings-serviceable-count">
      {t('ecommPortal.settings.serviceableCount', { count })}
    </Typography>
  );
}

function ShippingFields({ control }: Readonly<{ control: Control<ShippingValues> }>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1}>
      <Box sx={TWO_COLUMNS}>
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
      <Divider />
      <Typography component="h3" variant="subtitle2">
        {t('ecommPortal.settings.serviceablePincodes')}
      </Typography>
      <RhfSwitch
        control={control}
        name="serviceable_pincodes_enabled"
        label={t('ecommPortal.settings.serviceableEnabled')}
        hint={t('ecommPortal.settings.serviceableHint')}
        testId="settings-serviceable-enabled"
      />
      <RhfTextField
        control={control}
        name="serviceable_pincodes"
        label={t('ecommPortal.settings.serviceableList')}
        hint={t('ecommPortal.settings.onePerLine')}
        multiline
        minRows={4}
        data-testid="settings-serviceable-list"
      />
      <ServiceableCount control={control} />
    </Stack>
  );
}

/** What delivery costs the buyer, and — when the store limits itself — which pincodes it delivers to. */
export const SHIPPING_TAB: SettingsTabSpec<ShippingValues> = { makeSchema, toValues, toInput, Fields: ShippingFields };
