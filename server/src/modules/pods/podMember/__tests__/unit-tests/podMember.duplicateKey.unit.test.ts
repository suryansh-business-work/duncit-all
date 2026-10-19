import { ONE_UNPAID_JOINED_INDEX, isConcurrentFreeJoinError, isDuplicateKeyError } from '../../podMember.model';

// A free join that loses the race to the one-unpaid-booking index is retried as
// "already joined"; any other duplicate-key error, or anything else, must surface.
describe('podMember duplicate-key predicates', () => {
  const e11000 = (message: unknown) => ({ code: 11000, message });

  it('recognises E11000 and nothing else as a duplicate key', () => {
    expect(isDuplicateKeyError(e11000('dup'))).toBe(true);
    expect(isDuplicateKeyError({ code: 11001 })).toBe(false);
    expect(isDuplicateKeyError(new Error('boom'))).toBe(false);
    expect(isDuplicateKeyError(null)).toBe(false);
  });

  it('pins a concurrent free join on the one-unpaid-booking index only', () => {
    expect(isConcurrentFreeJoinError(e11000(`E11000 duplicate key error index: ${ONE_UNPAID_JOINED_INDEX}`))).toBe(true);
    expect(isConcurrentFreeJoinError(e11000('E11000 duplicate key error index: pod_id_1_user_id_1'))).toBe(false);
  });

  it('does not read a non-E11000 error as a lost free join, even when it names the index', () => {
    expect(isConcurrentFreeJoinError({ code: 121, message: ONE_UNPAID_JOINED_INDEX })).toBe(false);
  });

  it('refuses an E11000 whose message is missing or not text', () => {
    expect(isConcurrentFreeJoinError({ code: 11000 })).toBe(false);
    expect(isConcurrentFreeJoinError(e11000({ index: ONE_UNPAID_JOINED_INDEX }))).toBe(false);
  });
});
