/**
 * Shared validation regex patterns used by the `zodRules` builders and by
 * portal leaf-form schemas (slug/PAN/AADHAR/GSTIN/OTP/postal-code checks).
 * Superset of the per-portal `forms/validation` pattern constants — values
 * are copied verbatim so validation behavior is unchanged.
 */
export const PERSON_NAME_PATTERN = /^[A-Za-z][A-Za-z .'-]{0,59}$/;
export const PHONE_NUMBER_PATTERN = /^\d{6,15}$/;
export const PHONE_EXTENSION_PATTERN = /^\+?\d{1,5}$/;
export const SLUG_KEY_PATTERN = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;
export const PAN_PATTERN = /^[A-Z]{5}\d{4}[A-Z]$/;
export const AADHAR_PATTERN = /^\d{12}$/;
export const GSTIN_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/;
export const OTP_PATTERN = /^\d{4,8}$/;
export const POSTAL_CODE_PATTERN = /^[\dA-Za-z -]{3,12}$/;
