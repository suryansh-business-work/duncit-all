/**
 * The justification behind a free arrangement, as the server checks it: a
 * known reason, details within bounds (required for OTHER), clean text, the
 * policy accepted by a real account — and how the API shows it back.
 */
import { Types } from 'mongoose';
import { cleanFreeJustification, freeJustificationOut, FREE_DETAILS_LIMITS } from '../../venueOffer.free';

const userId = new Types.ObjectId().toString();
const refusal = (raw: Parameters<typeof cleanFreeJustification>[0], who = userId) => {
  try {
    cleanFreeJustification(raw, who);
  } catch (error) {
    return (error as { extensions?: { reason?: string; field?: string } }).extensions;
  }
  return null;
};

describe('cleanFreeJustification', () => {
  it('stamps a complete justification with who accepted the policy and when', () => {
    const at = new Date('2026-10-29T08:00:00Z');
    const result = cleanFreeJustification({ reason: 'INITIATIVE', details: '  Clean-up\n drive ', accepted: true }, userId, at);
    expect(result).toEqual({ reason: 'INITIATIVE', details: 'Clean-up drive', accepted_at: at, accepted_by: new Types.ObjectId(userId) });
  });

  it('refuses a missing or unknown reason', () => {
    expect(refusal(null)).toMatchObject({ reason: 'FREE_REASON_REQUIRED', field: 'free_justification' });
    expect(refusal({ reason: 'CHARITY', accepted: true })).toMatchObject({ reason: 'FREE_REASON_REQUIRED' });
  });

  it('refuses details over the bound and needs some for "other"', () => {
    expect(refusal({ reason: 'PROMOTIONAL', details: 'x'.repeat(FREE_DETAILS_LIMITS.max + 1), accepted: true })).toMatchObject({
      reason: 'FREE_DETAILS_TOO_LONG',
    });
    expect(refusal({ reason: 'OTHER', details: 'ab', accepted: true })).toMatchObject({ reason: 'FREE_DETAILS_REQUIRED' });
    expect(refusal({ reason: 'OTHER', details: 'NGO event', accepted: true })).toBeNull();
  });

  it('refuses details the chat would refuse, like a phone number', () => {
    expect(refusal({ reason: 'OTHER', details: 'Call me on 9876543210 for the deal', accepted: true })).toMatchObject({
      reason: 'MODERATION_BLOCKED',
    });
  });

  it('needs the policy accepted, by a real account', () => {
    expect(refusal({ reason: 'CAMPAIGN', accepted: false })).toMatchObject({ reason: 'FREE_POLICY_NOT_ACCEPTED' });
    expect(refusal({ reason: 'CAMPAIGN' })).toMatchObject({ reason: 'FREE_POLICY_NOT_ACCEPTED' });
    expect(refusal({ reason: 'CAMPAIGN', accepted: true }, 'not-an-id')).toMatchObject({ reason: 'FREE_POLICY_NOT_ACCEPTED' });
  });
});

describe('freeJustificationOut', () => {
  it('shows the reason, the details and when it was accepted — never who', () => {
    const at = new Date('2026-10-29T08:00:00Z');
    expect(freeJustificationOut({ reason: 'OTHER', details: 'NGO', accepted_at: at, accepted_by: new Types.ObjectId() })).toEqual({
      reason: 'OTHER',
      details: 'NGO',
      accepted_at: '2026-10-29T08:00:00.000Z',
    });
  });

  it('reads an older row with no details or time, and nothing for no justification', () => {
    expect(freeJustificationOut({ reason: 'CAMPAIGN', details: undefined, accepted_at: undefined, accepted_by: null } as never)).toEqual({
      reason: 'CAMPAIGN',
      details: '',
      accepted_at: null,
    });
    expect(freeJustificationOut(null)).toBeNull();
    expect(freeJustificationOut(undefined)).toBeNull();
  });
});
