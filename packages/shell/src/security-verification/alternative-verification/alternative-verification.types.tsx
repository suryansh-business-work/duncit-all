export {
  makeSecurityExceptionSchema,
  securityExceptionDefaults,
  type SecurityExceptionValues,
} from '@duncit/forms/schemas';

export interface AlternativeVerificationFormProps {
  /** Sends the request; a thrown error is shown by the caller, the form only stays put. */
  onSubmit: (reason: string) => Promise<void>;
  busy: boolean;
}
