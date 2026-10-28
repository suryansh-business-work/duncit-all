import type { PhysicalGiftCardValues } from '@duncit/forms/schemas';

/**
 * The printed-card form's contract. The rules, the input masks and what is sent
 * are the shared `@duncit/forms/schemas` ones mWeb's form also builds from, so
 * the two surfaces accept and refuse exactly the same input.
 */
export {
  formatPhysicalGiftCardNumber,
  formatPhysicalGiftCardPasscode,
  makePhysicalGiftCardSchema,
  physicalGiftCardDefaults,
  type PhysicalGiftCardValues,
} from '@duncit/forms/schemas';

export interface PhysicalGiftCardFormProps {
  /** True while the redemption is in flight — the button shows its spinner. */
  saving: boolean;
  /** The refusal to show above the button, already translated; null for none. */
  errorMessage: string | null;
  onSubmit: (values: PhysicalGiftCardValues) => void | Promise<void>;
}
