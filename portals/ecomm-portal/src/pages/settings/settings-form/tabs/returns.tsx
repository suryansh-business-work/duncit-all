import type { Control } from 'react-hook-form';
import { Divider, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { z } from 'zod';
import RhfFieldList from '../../../../components/form/FieldList';
import RhfNumberField from '../../../../components/form/RhfNumberField';
import RhfSwitch from '../../../../components/form/RhfSwitch';
import { numberText, toOptionalInt } from '../../../../lib/format';
import { makeRules } from '../../../../lib/rules';
import type { Translate } from '../../../../lib/translate';
import { BLANK_TEXT_ROW, fromTextRows, toTextRows, type SettingsTabSpec, type StoreSettings } from '../settings.types';

/** The server keeps up to 30 reasons of each kind. */
const MAX_REASONS = 30;

const makeSchema = (t: Translate) => {
  const r = makeRules(t);
  const reasons = z.array(z.object({ text: r.optionalText(120) }));
  return z.object({
    returns_enabled: z.boolean(),
    return_window_days: r.whole(),
    return_reasons: reasons,
    cancel_reasons: reasons,
    restock_on_cancel: z.boolean(),
  });
};

type ReturnsValues = z.infer<ReturnType<typeof makeSchema>>;

const toValues = (s: StoreSettings): ReturnsValues => ({
  returns_enabled: s.returns_enabled,
  return_window_days: numberText(s.return_window_days),
  return_reasons: toTextRows(s.return_reasons),
  cancel_reasons: toTextRows(s.cancel_reasons),
  restock_on_cancel: s.restock_on_cancel,
});

const toInput = (v: ReturnsValues) => ({
  returns_enabled: v.returns_enabled,
  return_window_days: toOptionalInt(v.return_window_days) ?? 0,
  return_reasons: fromTextRows(v.return_reasons),
  cancel_reasons: fromTextRows(v.cancel_reasons),
  restock_on_cancel: v.restock_on_cancel,
});

interface ReasonListProps {
  control: Control<ReturnsValues>;
  name: 'return_reasons' | 'cancel_reasons';
  title: string;
  itemLabel: (position: number) => string;
}

/** One editable list of reasons, under its heading. */
function ReasonList({ control, name, title, itemLabel }: Readonly<ReasonListProps>) {
  const { t } = useTranslation();
  return (
    <>
      <Divider />
      <Typography component="h3" variant="subtitle2">
        {title}
      </Typography>
      <RhfFieldList
        control={control}
        name={name}
        blank={BLANK_TEXT_ROW}
        max={MAX_REASONS}
        columns={[{ key: 'text', label: t('ecommPortal.returns.reason') }]}
        addLabel={t('ecommPortal.settings.addReason')}
        itemLabel={itemLabel}
      />
    </>
  );
}

function ReturnsFields({ control }: Readonly<{ control: Control<ReturnsValues> }>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1}>
      <RhfSwitch control={control} name="returns_enabled" label={t('ecommPortal.settings.returnsEnabled')} />
      <RhfNumberField
        control={control}
        name="return_window_days"
        label={t('ecommPortal.listing.returnWindow')}
        hint={t('ecommPortal.settings.returnWindowHint')}
        unit={t('ecommPortal.common.days')}
        whole
      />
      <ReasonList
        control={control}
        name="return_reasons"
        title={t('ecommPortal.settings.returnReasons')}
        itemLabel={(position) => t('ecommPortal.settings.returnReasonN', { vars: { n: position } })}
      />
      <ReasonList
        control={control}
        name="cancel_reasons"
        title={t('ecommPortal.settings.cancelReasons')}
        itemLabel={(position) => t('ecommPortal.settings.cancelReasonN', { vars: { n: position } })}
      />
      <RhfSwitch control={control} name="restock_on_cancel" label={t('ecommPortal.settings.restockOnCancel')} hint={t('ecommPortal.settings.restockHint')} />
    </Stack>
  );
}

/** Whether buyers may send goods back, for how long, and the reasons they and operators pick from. */
export const RETURNS_TAB: SettingsTabSpec<ReturnsValues> = { makeSchema, toValues, toInput, Fields: ReturnsFields };
