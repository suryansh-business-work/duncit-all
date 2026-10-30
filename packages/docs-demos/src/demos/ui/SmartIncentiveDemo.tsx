import { useEffect, useState } from 'react';
import { SmartIncentiveField } from '@duncit/ui';
import { formatMoney, mwebSmartIncentiveLabels, smartIncentivePctIssue } from '@duncit/utils';
import { defineDemo } from '../../types';
import { mwebT } from '../utils/translators';

interface SmartIncentiveMock {
  pod_id: string;
  pod_amount: number;
  /** Loyalty > Smart Incentive > Settings — the biggest discount a host may offer. */
  max_discount_pct: number;
  /** Loyalty > Smart Incentive > Settings — seconds on the pod page before the offer shows. */
  delay_seconds: number;
  smart_incentive_enabled: boolean;
  /** The discount as the host typed it — the form holds text, not a number. */
  smart_incentive_pct: string;
}

/** mWeb's own English for `mweb.smartIncentive.*`, resolved the way the Create Pod stepper does. */
const SMART_INCENTIVE_LABELS = mwebSmartIncentiveLabels(mwebT);

const formatPaise = (amount: number) => formatMoney(amount, { decimals: 2 });

/** Holds the switch and the percentage the way a form would — hoisted for the same reason as `SpotsDemo`. */
function SmartIncentiveDemo({ mock }: Readonly<{ mock: SmartIncentiveMock }>) {
  const [enabled, setEnabled] = useState(mock.smart_incentive_enabled);
  const [pct, setPct] = useState(mock.smart_incentive_pct);
  useEffect(() => {
    setEnabled(mock.smart_incentive_enabled);
    setPct(mock.smart_incentive_pct);
  }, [mock.smart_incentive_enabled, mock.smart_incentive_pct]);
  // What a surface's Zod refine does: the shared rule, worded by the same labels.
  const issue = enabled ? smartIncentivePctIssue(pct, mock.max_discount_pct) : null;
  return (
    <SmartIncentiveField
      enabled={enabled}
      pct={pct}
      onEnabledChange={setEnabled}
      onPctChange={setPct}
      maxPct={mock.max_discount_pct}
      delaySeconds={mock.delay_seconds}
      labels={SMART_INCENTIVE_LABELS}
      unitPrice={mock.pod_amount}
      formatPrice={formatPaise}
      error={issue ? SMART_INCENTIVE_LABELS.errors[issue](mock.max_discount_pct) : undefined}
    />
  );
}

export const smartIncentiveDemo = defineDemo<SmartIncentiveMock>({
  id: 'smart-incentive-field',
  title: 'SmartIncentiveField — a ₹499 pod offering 10% to members who are still deciding',
  note:
    'Switch it off and on again: switching it on opens the explainer, which quotes delay_seconds. Type 25 and it goes red, because Loyalty caps the discount at max_discount_pct. Clear the box and it asks for a discount; type 2.5 and it wants a whole number. The line under the box is what one ticket costs with the offer. Switch it off and the box goes; the typed % is kept but sent as off.',
  mock: {
    pod_id: 'DUN-POD-4821',
    pod_amount: 499,
    max_discount_pct: 20,
    delay_seconds: 15,
    smart_incentive_enabled: true,
    smart_incentive_pct: '10',
  },
  render: (mock) => <SmartIncentiveDemo mock={mock} />,
});
