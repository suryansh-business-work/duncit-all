/**
 * Rule 38's local fallback: every key this package renders must resolve to real
 * copy with no provider and no API, or a card shows raw keys offline.
 */
import { describe, expect, it } from 'vitest';

import { ADDRESS_FIELDS, STATUS_META, VERIFICATION_LABEL_KEYS } from '../src';
import { fallbackT, VERIFICATION_FALLBACK_FLAT } from '../src/mui/i18n';

const RENDERED_KEYS = [
  'verification.title',
  'verification.subtitle',
  'verification.submitted',
  'verification.upload',
  'verification.reupload',
  'verification.uploading',
  'verification.uploadPhoto',
  'verification.uploadPdf',
  'verification.tooLarge',
  'verification.docFailed',
  'verification.photoPermission',
  'verification.emailNote',
  'verification.addressRequired',
  'verification.addressFailed',
  'verification.submitAddress',
  'verification.updateAddress',
  'verification.submitting',
  'verification.line1Required',
  'verification.cityRequired',
  'verification.stateRequired',
  'verification.pincodeRequired',
];

describe('the shipped fallback bundle', () => {
  it('answers every key the cards render', () => {
    for (const key of RENDERED_KEYS) {
      expect(VERIFICATION_FALLBACK_FLAT[key], key).toBeTruthy();
    }
  });

  it('answers every type and status key the shared tables point at', () => {
    for (const key of Object.values(VERIFICATION_LABEL_KEYS)) {
      expect(VERIFICATION_FALLBACK_FLAT[key], key).toBeTruthy();
    }
    for (const meta of Object.values(STATUS_META)) {
      expect(VERIFICATION_FALLBACK_FLAT[meta.labelKey], meta.labelKey).toBeTruthy();
    }
  });

  it('answers every address label and placeholder', () => {
    for (const field of ADDRESS_FIELDS) {
      expect(VERIFICATION_FALLBACK_FLAT[field.labelKey], field.labelKey).toBeTruthy();
      expect(VERIFICATION_FALLBACK_FLAT[field.placeholderKey], field.placeholderKey).toBeTruthy();
    }
  });
});

describe('fallbackT', () => {
  it('resolves copy outside the React tree, which is where the schema is built', () => {
    expect(fallbackT('verification.line1Required')).toBe('Enter your street address');
    expect(fallbackT('verification.statusPending')).toBe('Under review');
  });
});
