import { CHALLENGE_CAPTION_MAX } from '@duncit/utils';

import {
  CHALLENGE_NAME_MAX,
  REASON_MAX,
  ROSTER_NAME_MAX,
  SUBMISSION_INITIAL_VALUES,
  judgeSheetInitialValues,
  makeCreateChallengeSchema,
  makeJudgeSheetSchema,
  makeReasonSchema,
  makeRosterSchema,
  makeSubmissionSchema,
} from '../challenge.form';

const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}|${Object.values(options.vars).join(',')}` : key;

const messages = (result: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}) =>
  result.success ? [] : (result.error?.issues ?? []).map((i) => `${i.path.join('.')}|${i.message}`);

describe('judge sheet', () => {
  const criteria = [
    { key: 'style', label: 'Style', max: 10 },
    { key: 'tech', label: 'Technique', max: 5 },
  ];
  const schema = makeJudgeSheetSchema(t, criteria);

  it('starts on the given competitor with every mark blank', () => {
    expect(judgeSheetInitialValues('c1', criteria)).toEqual({
      candidate_id: 'c1',
      marks: { style: '', tech: '' },
    });
  });

  it('accepts marks from zero to each criterion maximum', () => {
    expect(schema.safeParse({ candidate_id: 'c1', marks: { style: '0', tech: '5' } }).success).toBe(
      true,
    );
    expect(
      schema.safeParse({ candidate_id: 'c1', marks: { style: '10', tech: '2.5' } }).success,
    ).toBe(true);
  });

  it('asks for a competitor', () => {
    expect(
      messages(schema.safeParse({ candidate_id: '', marks: { style: '1', tech: '1' } })),
    ).toEqual(['candidate_id|mweb.challenge.errors.pickCompetitor']);
  });

  it.each([
    ['blank', ''],
    ['spaces', '  '],
    ['text', 'abc'],
    ['negative', '-1'],
    ['over the maximum', '11'],
    ['infinite', 'Infinity'],
  ])('rejects a %s mark, naming that criterion maximum', (_label, value) => {
    expect(
      messages(schema.safeParse({ candidate_id: 'c1', marks: { style: value, tech: '1' } })),
    ).toEqual(['marks.style|mweb.challenge.errors.mark|10']);
  });

  it('uses each criterion own maximum', () => {
    expect(
      messages(schema.safeParse({ candidate_id: 'c1', marks: { style: '1', tech: '6' } })),
    ).toEqual(['marks.tech|mweb.challenge.errors.mark|5']);
  });
});

describe('create challenge', () => {
  const schema = makeCreateChallengeSchema(t);

  it('needs a template; the name is optional', () => {
    expect(schema.safeParse({ template_id: 'tpl', name: '' }).success).toBe(true);
    expect(messages(schema.safeParse({ template_id: '', name: 'Derby' }))).toEqual([
      'template_id|mweb.challenge.errors.template',
    ]);
  });

  it('trims the name and caps its length', () => {
    expect(schema.parse({ template_id: 'tpl', name: '  Derby  ' }).name).toBe('Derby');
    expect(
      schema.safeParse({ template_id: 'tpl', name: 'x'.repeat(CHALLENGE_NAME_MAX) }).success,
    ).toBe(true);
    expect(
      messages(schema.safeParse({ template_id: 'tpl', name: 'x'.repeat(CHALLENGE_NAME_MAX + 1) })),
    ).toEqual(['name|mweb.challenge.errors.challengeName']);
  });
});

describe('roster', () => {
  const schema = makeRosterSchema(t);
  const row = (name: string) => ({ competitor_id: 'c1', name, user_id: '' });

  it('accepts a roster of named competitors and trims the names', () => {
    const parsed = schema.parse({ competitors: [row('  Asha  ')] });
    expect(parsed.competitors[0]?.name).toBe('Asha');
  });

  it('needs at least one competitor', () => {
    expect(messages(schema.safeParse({ competitors: [] }))).toEqual([
      'competitors|mweb.challenge.errors.noCompetitors',
    ]);
  });

  it('rejects a blank name or one over the limit', () => {
    expect(messages(schema.safeParse({ competitors: [row('   ')] }))).toEqual([
      'competitors.0.name|mweb.challenge.errors.name',
    ]);
    expect(schema.safeParse({ competitors: [row('x'.repeat(ROSTER_NAME_MAX))] }).success).toBe(
      true,
    );
    expect(
      messages(schema.safeParse({ competitors: [row('x'.repeat(ROSTER_NAME_MAX + 1))] })),
    ).toEqual(['competitors.0.name|mweb.challenge.errors.name']);
  });
});

describe('submission', () => {
  const file = { uri: 'file:///a.jpg', name: 'a.jpg', type: 'image/jpeg' };

  it('starts with no file, no caption and no competitor', () => {
    expect(SUBMISSION_INITIAL_VALUES).toEqual({ file: null, caption: '', competitor_id: '' });
  });

  it('needs a file', () => {
    expect(
      messages(makeSubmissionSchema(t, false).safeParse({ ...SUBMISSION_INITIAL_VALUES })),
    ).toEqual(['file|mweb.challenge.tools.errors.file']);
  });

  it('accepts a file with no caption for a competitor submitting for themselves', () => {
    expect(
      makeSubmissionSchema(t, false).safeParse({ file, caption: '', competitor_id: '' }).success,
    ).toBe(true);
  });

  it('trims the caption and caps its length', () => {
    const schema = makeSubmissionSchema(t, false);
    expect(schema.parse({ file, caption: '  hi  ', competitor_id: '' }).caption).toBe('hi');
    expect(
      schema.safeParse({ file, caption: 'x'.repeat(CHALLENGE_CAPTION_MAX), competitor_id: '' })
        .success,
    ).toBe(true);
    expect(
      messages(
        schema.safeParse({
          file,
          caption: 'x'.repeat(CHALLENGE_CAPTION_MAX + 1),
          competitor_id: '',
        }),
      ),
    ).toEqual([`caption|mweb.challenge.tools.errors.caption|${CHALLENGE_CAPTION_MAX}`]);
  });

  it('makes a host pick the competitor, and nobody else', () => {
    expect(
      messages(makeSubmissionSchema(t, true).safeParse({ file, caption: '', competitor_id: '' })),
    ).toEqual(['competitor_id|mweb.challenge.errors.pickCompetitor']);
    expect(
      makeSubmissionSchema(t, true).safeParse({ file, caption: '', competitor_id: 'c2' }).success,
    ).toBe(true);
  });
});

describe('reason', () => {
  it('requires three characters when required, trimmed', () => {
    const schema = makeReasonSchema(t, true);
    expect(messages(schema.safeParse({ reason: '' }))).toEqual([
      'reason|mweb.challenge.errors.reason',
    ]);
    expect(messages(schema.safeParse({ reason: ' ab ' }))).toEqual([
      'reason|mweb.challenge.errors.reason',
    ]);
    expect(schema.parse({ reason: '  abc  ' }).reason).toBe('abc');
  });

  it('caps the length whether or not it is required', () => {
    for (const required of [true, false]) {
      const schema = makeReasonSchema(t, required);
      expect(schema.safeParse({ reason: 'x'.repeat(REASON_MAX) }).success).toBe(true);
      expect(messages(schema.safeParse({ reason: 'x'.repeat(REASON_MAX + 1) }))).toEqual([
        'reason|mweb.challenge.errors.reasonLong',
      ]);
    }
  });

  it('lets an optional reason be blank', () => {
    expect(makeReasonSchema(t, false).safeParse({ reason: '' }).success).toBe(true);
  });
});
