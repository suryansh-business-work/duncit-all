/**
 * `@duncit/verification` — the account-verification rules, framework-free.
 *
 * Import this root anywhere: the native Tamagui screen, mWeb, the partner
 * console, a Node test. Nothing here touches React, MUI or Tamagui.
 * The MUI cards live behind `@duncit/verification/mui`.
 */
export type {
  AddressInput,
  AddressValues,
  Verification,
  VerificationAddress,
  VerificationStatus,
  VerificationTone,
  VerificationTranslate,
  VerificationType,
} from './types';

export {
  isVerificationLocked,
  isVerificationSettled,
  rejectReasonOf,
  STATUS_META,
  TONE_CHIP_COLOR,
  TONE_HEX,
  uploadLabelKey,
  VERIFICATION_LABEL_KEYS,
} from './labels';

export { base64ByteSize, DOCUMENT_ACCEPT, isDocumentTooLarge, MAX_DOC_BYTES } from './documents';

export { submissionErrorMessage } from './error-message';

export {
  ADDRESS_FIELDS,
  ADDRESS_ROWS,
  addressValuesFrom,
  blankAddressValues,
  buildAddressInput,
  isAddressComplete,
  makeAddressSchema,
  type AddressField,
  type AddressSchema,
} from './address.form';
