/**
 * The status table is what three surfaces agree on, so these assert the rules
 * a card reads rather than the sentences it renders: which statuses turn the
 * tick on, which take the action control away, and which row may show a reason.
 */
import { describe, expect, it } from 'vitest';

import {
  isVerificationLocked,
  isVerificationSettled,
  rejectReasonOf,
  STATUS_META,
  TONE_CHIP_COLOR,
  TONE_HEX,
  uploadLabelKey,
  VERIFICATION_LABEL_KEYS,
  type VerificationStatus,
} from '../src';

const ALL_STATUSES: VerificationStatus[] = [
  'NOT_SUBMITTED',
  'PENDING',
  'APPROVED',
  'REJECTED',
  'VERIFIED_BY_APP',
];

describe('label keys', () => {
  it('names every verification type through the catalogue, never a literal', () => {
    expect(VERIFICATION_LABEL_KEYS).toEqual({
      IDENTITY: 'verification.typeIdentity',
      ADDRESS: 'verification.typeAddress',
      EMAIL: 'verification.typeEmail',
    });
  });

  it('gives every status a key and a tone both palettes can render', () => {
    for (const status of ALL_STATUSES) {
      const meta = STATUS_META[status];
      expect(meta.labelKey.startsWith('verification.status')).toBe(true);
      expect(TONE_CHIP_COLOR[meta.tone]).toBeTruthy();
      expect(TONE_HEX[meta.tone]).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe('isVerificationSettled', () => {
  it('is true only once an admin approved it or the app verified it', () => {
    expect(isVerificationSettled('APPROVED')).toBe(true);
    expect(isVerificationSettled('VERIFIED_BY_APP')).toBe(true);
    expect(isVerificationSettled('PENDING')).toBe(false);
    expect(isVerificationSettled('REJECTED')).toBe(false);
    expect(isVerificationSettled('NOT_SUBMITTED')).toBe(false);
  });
});

describe('isVerificationLocked', () => {
  it('hides the control while approved or under review', () => {
    expect(isVerificationLocked('APPROVED')).toBe(true);
    expect(isVerificationLocked('PENDING')).toBe(true);
  });

  it('leaves the control open on a first submission and after a rejection', () => {
    expect(isVerificationLocked('NOT_SUBMITTED')).toBe(false);
    expect(isVerificationLocked('REJECTED')).toBe(false);
  });

  it('is not the same rule as settled — a rejected row is neither', () => {
    expect(isVerificationLocked('REJECTED')).toBe(false);
    expect(isVerificationSettled('REJECTED')).toBe(false);
    // …while PENDING locks without being settled, which is the pair that made
    // the two copies of this rule drift apart.
    expect(isVerificationLocked('PENDING')).toBe(true);
    expect(isVerificationSettled('PENDING')).toBe(false);
  });
});

describe('rejectReasonOf', () => {
  it('returns the reason on a rejected row', () => {
    expect(rejectReasonOf({ status: 'REJECTED', reject_reason: 'Blurred document' })).toBe(
      'Blurred document',
    );
  });

  it('returns null when a rejected row carries no reason', () => {
    expect(rejectReasonOf({ status: 'REJECTED', reject_reason: null })).toBeNull();
  });

  it('never leaks a stale reason once the row moves on', () => {
    expect(rejectReasonOf({ status: 'PENDING', reject_reason: 'Blurred document' })).toBeNull();
    expect(rejectReasonOf({ status: 'APPROVED', reject_reason: 'Blurred document' })).toBeNull();
  });
});

describe('uploadLabelKey', () => {
  it('reads as a first upload only before anything was submitted', () => {
    expect(uploadLabelKey('NOT_SUBMITTED')).toBe('verification.upload');
  });

  it('reads as a replacement once a document exists', () => {
    expect(uploadLabelKey('REJECTED')).toBe('verification.reupload');
    expect(uploadLabelKey('APPROVED')).toBe('verification.reupload');
  });
});
