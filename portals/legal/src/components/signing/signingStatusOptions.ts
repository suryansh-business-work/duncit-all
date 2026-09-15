import type { SigningStatus } from './types';

type Translate = (key: string) => string;

/**
 * The choices a signing-status column filters by, in the same words its chip
 * shows — Documents and Contracts both derive the status from `signed_at`.
 */
export const signingStatusOptions = (
  t: Translate
): ReadonlyArray<{ value: SigningStatus; label: string }> => [
  { value: 'SIGNED', label: t('legal.sign.signed') },
  { value: 'UNSIGNED', label: t('legal.sign.unsigned') },
];
