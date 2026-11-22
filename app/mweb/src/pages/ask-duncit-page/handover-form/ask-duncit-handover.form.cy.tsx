import { describe, expect, it } from 'vitest';
import { makeAskDuncitHandoverSchema } from '@duncit/forms/schemas';
import { fallbackT } from '../../../i18n/fallback';

// The handover form validates with the shared schema, bound to mWeb's own
// translator: this pins the words a member sees, not the raw keys.
const issuesOf = (values: { team: string; summary: string }) => {
  const result = makeAskDuncitHandoverSchema(fallbackT).safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
};

describe('Ask Duncit handover validation (mWeb)', () => {
  it('accepts a team with no summary', () => {
    expect(issuesOf({ team: 'SUPPORT', summary: '' })).toEqual([]);
  });

  it('refuses an unknown team with translated copy on the team field', () => {
    const [issue] = issuesOf({ team: 'NOBODY', summary: '' });
    expect(issue).toMatch(/^team: /);
    expect(issue).not.toContain('askDuncit.handover.teamRequired');
  });

  it('refuses a summary over the limit, naming the limit', () => {
    const [issue] = issuesOf({ team: 'ADMIN', summary: 'x'.repeat(601) });
    expect(issue).toMatch(/^summary: .*600/);
  });
});
