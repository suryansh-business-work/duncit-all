export {
  currentPasswordDefaults,
  makeCurrentPasswordSchema,
  makeNewPasswordSchema,
  newPasswordDefaults,
  type CurrentPasswordValues,
  type NewPasswordValues,
} from '@duncit/forms/schemas';

/** What a step does with its values; a thrown Error's message is shown. */
export interface PasswordStepProps<T> {
  loading: boolean;
  onSubmit: (values: T) => Promise<void>;
}
