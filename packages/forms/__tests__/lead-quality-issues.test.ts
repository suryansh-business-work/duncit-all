import { describe, expect, it } from 'vitest';
import {
  isLeadQualityLeaf,
  leadQualityFailure,
  leadQualityFieldName,
  leadQualityFormPath,
  leadQualityHasIssueWithin,
  leadQualityIssueMessage,
  leadQualityIssuesAt,
} from '../src/schemas/lead-quality-issues';

/** The key is echoed with its amount, so each assertion names the copy shown. */
const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}|${String(options.vars.amount)}` : key;

describe('leadQualityFieldName / leadQualityFormPath', () => {
  it('puts a key problem on the name, and a band key problem on the band label', () => {
    expect(leadQualityFieldName('criteria.2.key')).toBe('criteria.2.name');
    expect(leadQualityFieldName('criteria.1.sub_criteria.0.key')).toBe('criteria.1.sub_criteria.0.name');
    expect(leadQualityFieldName('bands.3.key')).toBe('bands.3.label');
  });

  it("puts a list's own problem on the list's root and leaves field paths alone", () => {
    expect(leadQualityFieldName('criteria')).toBe('criteria.root');
    expect(leadQualityFieldName('criteria.0.sub_criteria')).toBe('criteria.0.sub_criteria.root');
    expect(leadQualityFieldName('bands')).toBe('bands.root');
    expect(leadQualityFieldName('criteria.0.weightage')).toBe('criteria.0.weightage');
  });

  it('reads list positions as numbers for a Zod path', () => {
    expect(leadQualityFormPath('criteria.1.sub_criteria.0.points')).toEqual(['criteria', 1, 'sub_criteria', 0, 'points']);
    expect(leadQualityFormPath('bands')).toEqual(['bands', 'root']);
    expect(leadQualityFormPath('min_qualification_score')).toEqual(['min_qualification_score']);
  });

  it('knows which names are single fields', () => {
    expect(isLeadQualityLeaf('criteria.0.name')).toBe(true);
    expect(isLeadQualityLeaf('min_qualification_score')).toBe(true);
    expect(isLeadQualityLeaf('criteria.root')).toBe(false);
  });
});

describe('leadQualityIssueMessage', () => {
  it('words each code with its amount, and a blank amount when there is none', () => {
    expect(leadQualityIssueMessage(t, { path: 'criteria', code: 'TOTAL_UNDER', message: 'x', amount: 5 })).toBe(
      'crm.leadQualitySettings.issue.totalUnder|5',
    );
    expect(leadQualityIssueMessage(t, { path: 'criteria.0.name', code: 'NAME_REQUIRED', message: 'x', amount: null })).toBe(
      'crm.leadQualitySettings.issue.nameRequired|',
    );
    expect(leadQualityIssueMessage(t, { path: 'criteria.0.name', code: 'NAME_REQUIRED', message: 'x' })).toBe(
      'crm.leadQualitySettings.issue.nameRequired|',
    );
  });

  it('says two bands start at the same score for a duplicate band start, and a duplicate key otherwise', () => {
    expect(leadQualityIssueMessage(t, { path: 'bands.1.min', code: 'KEY_DUPLICATE', message: 'x' })).toBe(
      'crm.leadQualitySettings.issue.bandStartDuplicate',
    );
    expect(leadQualityIssueMessage(t, { path: 'bands.1.key', code: 'KEY_DUPLICATE', message: 'x' })).toBe(
      'crm.leadQualitySettings.issue.keyDuplicate|',
    );
  });

  it("falls back to the server's sentence for a code this build does not know", () => {
    expect(leadQualityIssueMessage(t, { path: 'criteria', code: 'BRAND_NEW', message: 'Something new is wrong.' })).toBe(
      'Something new is wrong.',
    );
  });
});

describe('leadQualityIssuesAt / leadQualityHasIssueWithin', () => {
  const issues = [
    { path: 'criteria', code: 'TOTAL_OVER', message: 'over' },
    { path: 'criteria.1.sub_criteria.0.points', code: 'NOT_A_NUMBER', message: 'nan' },
  ];

  it('lists only the problems on exactly that path', () => {
    expect(leadQualityIssuesAt(issues, 'criteria').map((issue) => issue.code)).toEqual(['TOTAL_OVER']);
    expect(leadQualityIssuesAt(issues, 'bands')).toEqual([]);
  });

  it('finds a problem at or inside a path, but not in a sibling that shares its prefix', () => {
    expect(leadQualityHasIssueWithin(issues, 'criteria.1.sub_criteria')).toBe(true);
    expect(leadQualityHasIssueWithin(issues, 'criteria')).toBe(true);
    expect(leadQualityHasIssueWithin(issues, 'criteria.1.sub')).toBe(false);
    expect(leadQualityHasIssueWithin(issues, 'bands')).toBe(false);
  });
});

describe('leadQualityFailure', () => {
  it('asks for a reload on a CONFLICT', () => {
    expect(leadQualityFailure({ code: 'CONFLICT' }, 'Changed meanwhile')).toEqual({ conflict: true, issues: [], message: 'Changed meanwhile' });
  });

  it('keeps only well-formed issues of a BAD_USER_INPUT refusal', () => {
    const valid = { path: 'criteria', code: 'TOTAL_OVER', message: 'Weightage cannot exceed 100%.', amount: 5 };
    const listed = [
      'text',
      null,
      {},
      { path: 1 },
      { path: 'criteria' },
      { path: 'criteria', code: 2 },
      { path: 'criteria', code: 'TOTAL_OVER' },
      { path: 'criteria', code: 'TOTAL_OVER', message: 3 },
      valid,
    ];
    expect(leadQualityFailure({ code: 'BAD_USER_INPUT', issues: listed }, 'Invalid')).toEqual({ conflict: false, issues: [valid], message: 'Invalid' });
  });

  it('reads no issues from a BAD_USER_INPUT without a list, another code, or no extensions at all', () => {
    expect(leadQualityFailure({ code: 'BAD_USER_INPUT', issues: 'none' }, 'Invalid').issues).toEqual([]);
    expect(leadQualityFailure({ code: 'FORBIDDEN', issues: [{ path: 'a', code: 'b', message: 'c' }] }, 'No access')).toEqual({
      conflict: false,
      issues: [],
      message: 'No access',
    });
    expect(leadQualityFailure(undefined, 'Network down')).toEqual({ conflict: false, issues: [], message: 'Network down' });
    expect(leadQualityFailure(null, 'Network down').conflict).toBe(false);
  });
});
