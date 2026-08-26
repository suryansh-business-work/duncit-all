export { default as ContactSection } from './ContactSection';
export { default as ContactRows } from './ContactRows';
export { default as ChangeContactDialog } from './ChangeContactDialog';
export { useContactChange, type ContactChangeState } from './useContactChange';
export {
  contactOtpSchema,
  makeContactValueSchema,
  type ContactOtpValues,
  type ContactValueValues,
} from './contact-change.types';
export {
  CONFIRM_EMAIL_CHANGE,
  CONFIRM_PHONE_CHANGE,
  REQUEST_EMAIL_CHANGE_OTP,
  REQUEST_PHONE_CHANGE_OTP,
} from './queries';
