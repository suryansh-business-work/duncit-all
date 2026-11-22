export interface ShortfallFundingValues {
  /** Who funds the shortfall, in the reviewer's words. Recorded on every payout approved. */
  note: string;
}

export interface ShortfallFundingFormProps {
  /** What the pending payouts come to, paid in full. */
  total: number;
  /** How much of that the pod's takings do not cover. */
  shortfall: number;
  /** The Finance currency symbol. */
  symbol: string;
  busy: boolean;
  /** Why the server refused the last attempt, shown above the field. */
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (values: ShortfallFundingValues) => Promise<void> | void;
}
