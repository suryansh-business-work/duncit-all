/**
 * What a pod is written with when it is (or stops being) free: a paid pod
 * carries no justification; a free one carries the host's, checked; staff may
 * leave it out; a host may not.
 */
import { Types } from 'mongoose';
import { freePodJustification } from '../../pod.free';

const hostId = new Types.ObjectId().toString();
const existing = { reason: 'CAMPAIGN' as const, details: '', accepted_at: new Date('2026-10-01T10:00:00Z'), accepted_by: new Types.ObjectId() };
const reasonOf = (run: () => unknown) => {
  try {
    run();
  } catch (error) {
    return (error as { extensions?: { reason?: string; code?: string } }).extensions;
  }
  return null;
};

describe('freePodJustification', () => {
  it('drops any justification from a paid pod', () => {
    expect(freePodJustification('PAID', { reason: 'CAMPAIGN', accepted: true }, { userId: hostId, source: 'HOST' }, existing)).toBeNull();
    expect(freePodJustification(undefined, null, { source: 'ADMIN' })).toBeNull();
  });

  it("checks and stamps a free pod's justification with who accepted it", () => {
    const at = Date.now();
    const result = freePodJustification('FREE', { reason: 'OTHER', details: ' NGO   tie-up ', accepted: true }, { userId: hostId, source: 'HOST' });
    expect(result).toMatchObject({ reason: 'OTHER', details: 'NGO tie-up' });
    expect(String(result?.accepted_by)).toBe(hostId);
    expect(result?.accepted_at.getTime()).toBeGreaterThanOrEqual(at);
  });

  it('keeps the justification a free pod already has when none is sent', () => {
    expect(freePodJustification('FREE', null, { userId: hostId, source: 'HOST' }, existing)).toBe(existing);
    // A justification with no one to stamp it falls back to the one kept.
    expect(freePodJustification('FREE', { reason: 'PROMOTIONAL', accepted: true }, { source: 'ADMIN' }, existing)).toBe(existing);
  });

  it('lets staff and the system make a pod free without one', () => {
    expect(freePodJustification('FREE', null, { userId: hostId, source: 'ADMIN' })).toBeNull();
    expect(freePodJustification('FREE', undefined, { source: 'SYSTEM' })).toBeNull();
    expect(freePodJustification('FREE', undefined, { userId: hostId, source: 'CLUB_ADMIN' })).toBeNull();
  });

  it('refuses a host making a pod free without one', () => {
    expect(reasonOf(() => freePodJustification('FREE', null, { userId: hostId, source: 'HOST' }))).toMatchObject({
      code: 'FAILED_PRECONDITION',
      reason: 'FREE_JUSTIFICATION_REQUIRED',
    });
  });

  it("refuses a host's incomplete justification for what is missing", () => {
    expect(reasonOf(() => freePodJustification('FREE', { reason: 'OTHER', accepted: true }, { userId: hostId, source: 'HOST' }))).toMatchObject({
      reason: 'FREE_DETAILS_REQUIRED',
    });
  });
});
