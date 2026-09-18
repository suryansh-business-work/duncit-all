import type { Control } from 'react-hook-form';
import { Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { z } from 'zod';
import RhfNumberField from '../../../../components/form/RhfNumberField';
import RhfSwitch from '../../../../components/form/RhfSwitch';
import { numberText, splitLines, toNumber } from '../../../../lib/format';
import { makeRules } from '../../../../lib/rules';
import type { Translate } from '../../../../lib/translate';
import type { SettingsTabSpec, StoreSettings } from '../settings.types';

/** The server's limits: a discount of at most half, deliveries every 1–26 weeks. */
const DISCOUNT_MAX = 50;
const WEEKS_MIN = 1;
const WEEKS_MAX = 26;

const weeksOf = (text: string): number[] => splitLines(text).map(Number);
const validWeeks = (text: string) =>
  weeksOf(text).every((weeks) => Number.isInteger(weeks) && weeks >= WEEKS_MIN && weeks <= WEEKS_MAX);

const makeSchema = (t: Translate) => {
  const r = makeRules(t);
  return z.object({
    autoship_enabled: z.boolean(),
    autoship_discount_pct: r.percent(DISCOUNT_MAX),
    autoship_frequencies: z
      .string()
      .refine(validWeeks, t('ecommPortal.settings.frequencyRule', { vars: { min: WEEKS_MIN, max: WEEKS_MAX } })),
  });
};

type AutoshipValues = z.infer<ReturnType<typeof makeSchema>>;

const toValues = (s: StoreSettings): AutoshipValues => ({
  autoship_enabled: s.autoship_enabled,
  autoship_discount_pct: numberText(s.autoship_discount_pct),
  autoship_frequencies: s.autoship_frequencies.join(', '),
});

const toInput = (v: AutoshipValues) => ({
  autoship_enabled: v.autoship_enabled,
  autoship_discount_pct: toNumber(v.autoship_discount_pct),
  autoship_frequencies: weeksOf(v.autoship_frequencies),
});

function AutoshipFields({ control }: Readonly<{ control: Control<AutoshipValues> }>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1}>
      <RhfSwitch
        control={control}
        name="autoship_enabled"
        label={t('ecommPortal.settings.autoshipEnabled')}
        hint={t('ecommPortal.settings.autoshipHint')}
      />
      <RhfNumberField
        control={control}
        name="autoship_discount_pct"
        label={t('ecommPortal.settings.autoshipDiscount')}
        hint={t('ecommPortal.settings.autoshipDiscountHint', { vars: { max: DISCOUNT_MAX } })}
        unit="%"
      />
      <RhfTextField
        control={control}
        name="autoship_frequencies"
        label={t('ecommPortal.settings.autoshipFrequencies')}
        hint={t('ecommPortal.settings.autoshipFrequenciesHint', { vars: { min: WEEKS_MIN, max: WEEKS_MAX } })}
      />
    </Stack>
  );
}

/** Subscribe & save: whether it is offered, its discount, and the delivery rhythms a buyer may pick. */
export const AUTOSHIP_TAB: SettingsTabSpec<AutoshipValues> = { makeSchema, toValues, toInput, Fields: AutoshipFields };
