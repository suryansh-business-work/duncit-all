import { useEffect, useMemo } from 'react';
import { useController } from 'react-hook-form';
import { Box } from '@mui/material';
import { TicketDiscountField } from '@duncit/ui';
import {
  multiDateTiersForEditor,
  mwebMultiDateDiscountLabels,
  type MultiDateDiscountTier,
  type TicketDiscountTier,
} from '@duncit/utils';
import { usePricing } from '../../../../hooks/usePricing';
import { useTranslation } from '../../../../i18n/useTranslation';
import { SURFACE_SX } from '../../../../theme';
import type { CreatePodForm } from '../create-pod.types';
import { toTierFieldErrors as toFieldErrors } from './tier-errors';

interface Props {
  form: CreatePodForm;
  /** Pod Settings' default — what the editor starts with until the host edits it. */
  defaults: readonly MultiDateDiscountTier[];
  maxDates: number;
  maxPct: number;
}

/**
 * The multi-date booking discount of a recurring pod: the shared tier editor,
 * counted in dates. It starts from Admin > Pods > Pod Settings' default and
 * the host may change or switch it off. Native twin: RepeatDiscountField.
 */
export default function RepeatDiscountField({ form, defaults, maxDates, maxPct }: Readonly<Props>) {
  const { t } = useTranslation();
  const { format } = usePricing();
  const labels = useMemo(() => mwebMultiDateDiscountLabels(t), [t]);
  const enabled = useController({ control: form.control, name: 'repeat_discount_enabled' });
  const tiers = useController({ control: form.control, name: 'repeat_discount_tiers' });
  const touched = enabled.fieldState.isDirty || tiers.fieldState.isDirty;

  // Until the host touches it, the editor shows the platform default.
  useEffect(() => {
    if (touched) return;
    form.setValue('repeat_discount_enabled', defaults.length > 0);
    form.setValue('repeat_discount_tiers', multiDateTiersForEditor(defaults));
  }, [defaults, touched, form]);

  const markDirty = { shouldDirty: true };
  const unitPrice = Number(form.watch('pod_amount')) || 0;
  return (
    <Box data-testid="pod-repeat-discount" sx={{ ...SURFACE_SX, p: 2 }}>
      <TicketDiscountField
        enabled={enabled.field.value}
        tiers={tiers.field.value}
        onEnabledChange={(next: boolean) => form.setValue('repeat_discount_enabled', next, markDirty)}
        onTiersChange={(next: TicketDiscountTier[]) => {
          form.setValue('repeat_discount_tiers', next, markDirty);
          if (tiers.fieldState.error) tiers.field.onBlur();
        }}
        maxPct={maxPct}
        maxTickets={maxDates}
        labels={labels}
        unitPrice={unitPrice > 0 ? unitPrice : undefined}
        formatPrice={format}
        errors={toFieldErrors(tiers.fieldState.error, tiers.field.value.length)}
      />
    </Box>
  );
}
