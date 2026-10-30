import type { SmartIncentiveLabels } from './smart-incentive-copy';

/**
 * The contract both Smart Incentive editors render against — the MUI one in
 * `@duncit/ui` (mWeb Create Pod, the host's Edit Pod dialog) and its Tamagui
 * twin in the native app. Types only: the twins share their shape here and
 * keep their UI apart.
 *
 * Switching the incentive ON opens the explainer, so a host never turns it on
 * without being told what it does and who pays for it; "How it works" reopens it.
 */
export type SmartIncentiveFieldProps = Readonly<{
  enabled: boolean;
  /** The discount as typed. */
  pct: string;
  onEnabledChange: (enabled: boolean) => void;
  onPctChange: (pct: string) => void;
  onPctBlur?: () => void;
  /** Loyalty's `max_discount_pct`. */
  maxPct: number;
  /** Loyalty's `delay_seconds`, quoted in the explainer. */
  delaySeconds: number;
  labels: SmartIncentiveLabels;
  /** The pod's ticket price; with `formatPrice` it adds what a ticket costs with the offer. */
  unitPrice?: number;
  formatPrice?: (amount: number) => string;
  /** The message the form resolved for the percentage. */
  error?: string;
  disabled?: boolean;
}>;
