import { useController, type Control } from 'react-hook-form';
import { SmartIncentiveField } from '@duncit/ui';
import { formatMoney, type SmartIncentiveLabels } from '@duncit/utils';
import type { PodEditSmartIncentive } from './pod-edit-smart-incentive';
import type { PodEditFormInput, PodEditValues } from './pod-edit.form';

interface Props {
  control: Control<PodEditFormInput, unknown, PodEditValues>;
  /** The dialog's Smart Incentive context — null when the list never selected the pod's offer. */
  incentive: PodEditSmartIncentive | null;
  labels: SmartIncentiveLabels;
  /** The pod's ticket price — the editor then shows what one ticket costs with the offer. */
  unitPrice: number;
}

/** Offer prices to the paisa, like the tier prices beside them: 15% off ₹499 is ₹424.15. */
const formatOfferPrice = (amount: number) => formatMoney(amount, { decimals: 2 });

/**
 * The Smart Incentive, inside the host's Edit Pod sheet.
 *
 * Only the wiring lives here — the editor (the switch, the percentage, what a
 * ticket then costs, and the explainer that opens when it is switched on) is
 * `@duncit/ui`'s shared `SmartIncentiveField`, the one mWeb's Create Pod renders
 * too. Offered on a paid pod only, and only while Loyalty runs the programme;
 * hidden, the stored offer still travels back unchanged on save.
 */
export default function PodSmartIncentiveField({ control, incentive, labels, unitPrice }: Readonly<Props>) {
  const enabled = useController({ control, name: 'smart_incentive_enabled' });
  const pct = useController({ control, name: 'smart_incentive_pct' });
  if (!incentive || incentive.free || !incentive.programme.enabled) return null;

  return (
    <SmartIncentiveField
      enabled={enabled.field.value}
      pct={pct.field.value}
      onEnabledChange={enabled.field.onChange}
      onPctChange={pct.field.onChange}
      onPctBlur={pct.field.onBlur}
      maxPct={incentive.programme.maxPct}
      delaySeconds={incentive.programme.delaySeconds}
      labels={labels}
      unitPrice={unitPrice}
      formatPrice={formatOfferPrice}
      error={pct.fieldState.error?.message}
    />
  );
}
