export {
  makeTwoFactorCodeSchema,
  twoFactorCodeDefaults,
  type TwoFactorCodeValues,
} from '@duncit/forms/schemas';

export interface TwoFactorCodeFormProps {
  /**
   * Also accept a recovery code. Off while setting up — only the app can prove
   * the scan — and on for signing in and turning it off.
   */
  allowRecovery: boolean;
  loading: boolean;
  submitLabel: string;
  /** Prefix for the field, button and error test ids. */
  testId: string;
  /** Runs the step; a thrown Error's message is shown under the form. */
  onSubmit: (code: string) => Promise<void>;
}
