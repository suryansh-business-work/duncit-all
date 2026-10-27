import { describe, expect, it } from 'vitest';

import { isEveryPolicyAccepted, toggleAccepted } from '../acceptance';
import type { SignupPolicy } from '../useSignupPolicies';

const policy = (id: string): SignupPolicy => ({ id, slug: id, title: id, content: '' });

describe('isEveryPolicyAccepted', () => {
  it('is true only when every listed policy is ticked', () => {
    const policies = [policy('a'), policy('b')];
    expect(isEveryPolicyAccepted(policies, ['a', 'b'])).toBe(true);
    expect(isEveryPolicyAccepted(policies, ['a'])).toBe(false);
    expect(isEveryPolicyAccepted(policies, [])).toBe(false);
  });

  it('ignores ticks for policies that are no longer listed', () => {
    expect(isEveryPolicyAccepted([policy('a')], ['a', 'stale'])).toBe(true);
  });

  it('is vacuously true for an empty list (callers guard on loading)', () => {
    expect(isEveryPolicyAccepted([], [])).toBe(true);
  });
});

describe('toggleAccepted', () => {
  it('adds an id when ticked', () => {
    expect(toggleAccepted(['a'], 'b', true)).toEqual(['a', 'b']);
  });

  it('is idempotent when the same id is ticked twice', () => {
    expect(toggleAccepted(['a', 'b'], 'b', true)).toEqual(['a', 'b']);
  });

  it('removes an id when unticked and leaves the rest', () => {
    expect(toggleAccepted(['a', 'b'], 'a', false)).toEqual(['b']);
  });

  it('does not mutate its input', () => {
    const input = ['a'];
    toggleAccepted(input, 'b', true);
    expect(input).toEqual(['a']);
  });
});
