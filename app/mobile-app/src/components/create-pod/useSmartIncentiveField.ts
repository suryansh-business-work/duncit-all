import { useMemo } from 'react';
import { mwebSmartIncentiveLabels } from '@duncit/utils';

import { useSmartIncentiveSettings } from '@/hooks/useSmartIncentiveSettings';
import { useTranslation } from '@/hooks/useTranslation';
import { formatMoney } from '@/utils/checkout-math';
import type { SmartIncentiveFieldProps } from './SmartIncentiveField';

export type SmartIncentiveFieldSource = Readonly<{
  enabled: boolean;
  /** The discount as typed. */
  pct: string;
  /** One ticket's price, for the preview under the box (0 hides it). */
  unitPrice: number;
  /** The admin's currency symbol (public finance settings). */
  currency: string;
  /** The message the form resolved for `smart_incentive_pct`. */
  error: string | undefined;
  onEnabledChange: (enabled: boolean) => void;
  onPctChange: (pct: string) => void;
}>;

/**
 * Everything `SmartIncentiveField` needs that is not the form's own values:
 * Loyalty's maximum and delay, the translated labels and the price preview.
 * Null while the programme is off (or its settings have not loaded), and the
 * editor is then left out. Shared by the Create / Club Admin stepper and the
 * host's Edit Pod sheet, so the two surfaces render the field one way.
 */
export function useSmartIncentiveField(
  source: SmartIncentiveFieldSource,
): SmartIncentiveFieldProps | null {
  const { t } = useTranslation();
  const settings = useSmartIncentiveSettings();
  const labels = useMemo(() => mwebSmartIncentiveLabels(t), [t]);
  if (!settings.enabled) return null;
  return {
    enabled: source.enabled,
    pct: source.pct,
    onEnabledChange: source.onEnabledChange,
    onPctChange: source.onPctChange,
    maxPct: settings.maxPct,
    delaySeconds: settings.delaySeconds,
    labels,
    unitPrice: source.unitPrice > 0 ? source.unitPrice : undefined,
    formatPrice: (amount) => formatMoney(source.currency, amount),
    error: source.error,
  };
}
