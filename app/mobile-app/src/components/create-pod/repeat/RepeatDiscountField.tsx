import { useEffect, useMemo } from 'react';
import {
  multiDateTiersForEditor,
  mwebMultiDateDiscountLabels,
  type MultiDateDiscountTier,
} from '@duncit/utils';

import { SurfaceCard } from '@/components/SurfaceCard';
import { useTranslation } from '@/hooks/useTranslation';
import { formatMoney } from '@/utils/checkout-math';
import type { CreatePodForm } from '../create-pod.types';
import { TicketDiscountField } from '../TicketDiscountField';
import { ticketDiscountFieldErrors } from '../ticket-discount.form';

interface Props {
  form: CreatePodForm;
  /** Pod Settings' default — what the editor starts with until the host edits it. */
  defaults: readonly MultiDateDiscountTier[];
  maxDates: number;
  maxPct: number;
  currency: string;
}

/**
 * The multi-date booking discount of a recurring pod: the shared tier editor,
 * counted in dates. It starts from Admin > Pods > Pod Settings' default and
 * the host may change or switch it off. mWeb twin: RepeatDiscountField.
 */
export function RepeatDiscountField({
  form,
  defaults,
  maxDates,
  maxPct,
  currency,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = useMemo(() => mwebMultiDateDiscountLabels(t), [t]);
  const { watch, setValue, getFieldState, formState } = form;
  const enabled = watch('repeat_discount_enabled');
  const tiers = watch('repeat_discount_tiers');
  const touched =
    getFieldState('repeat_discount_enabled', formState).isDirty ||
    getFieldState('repeat_discount_tiers', formState).isDirty;

  // Until the host touches it, the editor shows the platform default.
  useEffect(() => {
    if (touched) return;
    setValue('repeat_discount_enabled', defaults.length > 0);
    setValue('repeat_discount_tiers', multiDateTiersForEditor(defaults));
  }, [defaults, touched, setValue]);

  const unitPrice = Number(watch('pod_amount_text')) || 0;
  return (
    <SurfaceCard testID="pod-repeat-discount">
      <TicketDiscountField
        enabled={enabled}
        tiers={tiers}
        onEnabledChange={(next) => setValue('repeat_discount_enabled', next, { shouldDirty: true })}
        onTiersChange={(next) =>
          setValue('repeat_discount_tiers', next, { shouldDirty: true, shouldValidate: true })
        }
        maxPct={maxPct}
        maxTickets={maxDates}
        labels={labels}
        unitPrice={unitPrice > 0 ? unitPrice : undefined}
        formatPrice={(amount) => formatMoney(currency, amount)}
        errors={ticketDiscountFieldErrors(formState.errors.repeat_discount_tiers, tiers.length)}
      />
    </SurfaceCard>
  );
}
