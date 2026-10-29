/**
 * Free arrangements — the reasons a host may give for a free pod or a free
 * venue, the checks the server repeats, and how a free booking is recognised.
 */
import { describe, expect, it } from 'vitest';

import {
  FREE_DETAILS_LIMITS,
  FREE_JUSTIFICATION_FIELDS,
  FREE_POLICY_KEYS,
  FREE_REASONS,
  FREE_REASON_KEY,
  FREE_VALIDATION_KEYS,
  freeDetailsOf,
  freeJustificationInput,
  freeJustificationProblem,
  freeReasonKey,
  isFreeArrangement,
  isFreeReason,
} from '../src/free-arrangement';

describe('free reasons', () => {
  it('lists the four reasons in picker order, each with its own label key', () => {
    expect(FREE_REASONS).toEqual(['INITIATIVE', 'PROMOTIONAL', 'CAMPAIGN', 'OTHER']);
    expect(Object.keys(FREE_REASON_KEY)).toEqual([...FREE_REASONS]);
    for (const reason of FREE_REASONS) expect(FREE_REASON_KEY[reason]).toMatch(/^availability\.freeArrangement\.reason\./);
  });

  it('knows only the four reasons', () => {
    for (const reason of FREE_REASONS) expect(isFreeReason(reason)).toBe(true);
    expect(isFreeReason('CHARITY')).toBe(false);
    expect(isFreeReason('')).toBe(false);
    expect(isFreeReason(null)).toBe(false);
    expect(isFreeReason(undefined)).toBe(false);
  });

  it("names a known reason and nothing for one this client doesn't know", () => {
    expect(freeReasonKey('CAMPAIGN')).toBe('availability.freeArrangement.reason.campaign');
    expect(freeReasonKey('CHARITY')).toBe('');
    expect(freeReasonKey(null)).toBe('');
  });
});

describe('freeDetailsOf', () => {
  it('keeps the details on one line, trimmed, as the server stores them', () => {
    expect(freeDetailsOf('  Diwali\n\n  community   meet ')).toBe('Diwali community meet');
    expect(freeDetailsOf(null)).toBe('');
    expect(freeDetailsOf(undefined)).toBe('');
  });
});

describe('freeJustificationProblem', () => {
  const complete = { reason: 'PROMOTIONAL', details: '', accepted: true };

  it('asks for a reason first', () => {
    expect(freeJustificationProblem({ ...complete, reason: '' })).toBe('reason');
    expect(freeJustificationProblem({ ...complete, reason: 'CHARITY' })).toBe('reason');
    expect(freeJustificationProblem({ ...complete, reason: null })).toBe('reason');
  });

  it('refuses details longer than the server keeps, for any reason', () => {
    const tooLong = 'x'.repeat(FREE_DETAILS_LIMITS.max + 1);
    expect(freeJustificationProblem({ ...complete, details: tooLong })).toBe('detailsTooLong');
    expect(freeJustificationProblem({ ...complete, details: 'x'.repeat(FREE_DETAILS_LIMITS.max) })).toBeNull();
  });

  it('needs details for "other", counted after whitespace is collapsed', () => {
    expect(freeJustificationProblem({ ...complete, reason: 'OTHER', details: '  a  ' })).toBe('details');
    expect(freeJustificationProblem({ ...complete, reason: 'OTHER', details: null })).toBe('details');
    expect(freeJustificationProblem({ ...complete, reason: 'OTHER', details: 'NGO tie-up' })).toBeNull();
  });

  it('needs the policy accepted — nothing but true counts', () => {
    expect(freeJustificationProblem({ ...complete, accepted: false })).toBe('accept');
    expect(freeJustificationProblem({ ...complete, accepted: null })).toBe('accept');
    expect(freeJustificationProblem({ reason: 'INITIATIVE' })).toBe('accept');
  });

  it('is null for a complete justification', () => {
    expect(freeJustificationProblem(complete)).toBeNull();
  });

  it('names a message key for every problem it can report', () => {
    expect(Object.keys(FREE_VALIDATION_KEYS).sort()).toEqual(['accept', 'details', 'detailsTooLong', 'reason']);
    for (const key of Object.values(FREE_VALIDATION_KEYS)) expect(key).toMatch(/^availability\.freeArrangement\.validation\./);
  });
});

describe('freeJustificationInput', () => {
  it('is null until the justification is complete and accepted', () => {
    expect(freeJustificationInput({ reason: 'OTHER', details: '', accepted: true })).toBeNull();
    expect(freeJustificationInput({ reason: 'CAMPAIGN', details: '', accepted: false })).toBeNull();
    expect(freeJustificationInput({ reason: undefined, accepted: true })).toBeNull();
  });

  it('sends the reason, the cleaned details and the acceptance', () => {
    expect(freeJustificationInput({ reason: 'OTHER', details: ' Partner  NGO event ', accepted: true })).toEqual({
      reason: 'OTHER',
      details: 'Partner NGO event',
      accepted: true,
    });
    expect(freeJustificationInput({ reason: 'INITIATIVE', accepted: true })).toEqual({
      reason: 'INITIATIVE',
      details: '',
      accepted: true,
    });
  });
});

describe('isFreeArrangement', () => {
  it('is true for a free venue and for any offer on a free pod', () => {
    expect(isFreeArrangement({ model: 'FREE' })).toBe(true);
    expect(isFreeArrangement({ model: 'FLAT', free_pod: true })).toBe(true);
  });

  it('is false for a priced offer on a paid pod, and for no offer', () => {
    expect(isFreeArrangement({ model: 'PER_GUEST', free_pod: false })).toBe(false);
    expect(isFreeArrangement({ model: null })).toBe(false);
    expect(isFreeArrangement(null)).toBe(false);
    expect(isFreeArrangement(undefined)).toBe(false);
  });
});

describe('free policy copy', () => {
  it('keeps every key of the policy under one namespace, in reading order', () => {
    expect(FREE_POLICY_KEYS.paragraphs).toHaveLength(3);
    expect(FREE_POLICY_KEYS.detailsPoints).toHaveLength(5);
    const keys = [
      ...FREE_POLICY_KEYS.paragraphs,
      ...FREE_POLICY_KEYS.detailsPoints,
      FREE_POLICY_KEYS.title,
      FREE_POLICY_KEYS.accept,
      FREE_POLICY_KEYS.warning,
    ];
    for (const key of keys) expect(key).toMatch(/^availability\.freeArrangement\./);
  });

  it('selects the justification a query reads beside an offer or a pod', () => {
    for (const field of ['free_justification {', 'reason', 'details', 'accepted_at']) {
      expect(FREE_JUSTIFICATION_FIELDS).toContain(field);
    }
  });
});
