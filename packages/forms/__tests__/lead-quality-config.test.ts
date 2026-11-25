import { describe, expect, it } from 'vitest';
import {
  leadQualityEditor,
  leadQualityNumber,
  type LeadQualityBody,
  type LeadQualityMode,
  type LeadQualityRules,
  type LeadQualityStoredConfig,
} from '../src/schemas/lead-quality-config';
import type { LeadQualityIssueLike } from '../src/schemas/lead-quality-issues';

/**
 * The scoring-model editor bound to a set of rules. The rules themselves are
 * the server's (tested there, and copied into each client by a generator), so
 * here they are a stand-in that records what it was asked to check and
 * reports the problems a test gives it: what is under test is the editor's own
 * work — the conversions, and where each reported problem lands.
 */

const CHECKS = ['NONE', 'CRM_UNIQUENESS', 'INSTAGRAM_FOLLOWERS_MIN'] as const;
const TONES = ['success', 'warning', 'error'] as const;
type Check = (typeof CHECKS)[number];
type Tone = (typeof TONES)[number];

const checked: { body: LeadQualityBody<Check, Tone> | null; mode: LeadQualityMode | null; report: LeadQualityIssueLike[] } = {
  body: null,
  mode: null,
  report: [],
};
const rules: LeadQualityRules<Check, Tone> = {
  AUTO_CHECKS: CHECKS,
  BAND_TONES: TONES,
  THRESHOLD_CHECKS: ['INSTAGRAM_FOLLOWERS_MIN'],
  withKeys: (body) => ({ ...body, criteria: body.criteria.map((c, i) => ({ ...c, key: c.key || `made_${i}` })) }),
  validateQualityConfig: (body, mode) => {
    checked.body = body;
    checked.mode = mode;
    return checked.report;
  },
};
const editor = leadQualityEditor(rules);
const t = (key: string, options?: { vars?: Record<string, string | number> }) => `${key}|${String(options?.vars?.amount ?? '')}`;

const STORED: LeadQualityStoredConfig<Check> = {
  status: 'DRAFT',
  change_note: 'Tightened Instagram',
  min_qualification_score: 61,
  criteria: [
    {
      key: 'instagram',
      name: 'Instagram',
      weightage: 40,
      enabled: true,
      mandatory: true,
      auto_check: 'NONE',
      threshold: null,
      guidance: 'Check the profile',
      sub_criteria: [
        { key: 'followers', name: 'Followers', points: 25.5, mandatory: false, auto_check: 'INSTAGRAM_FOLLOWERS_MIN', threshold: 1000, guidance: '' },
        { key: 'business', name: 'Business', points: 14.5, mandatory: true, auto_check: 'NONE', guidance: '' },
      ],
    },
    { key: 'dedup', name: 'Unique', weightage: 60, enabled: false, mandatory: false, auto_check: 'CRM_UNIQUENESS', guidance: '', sub_criteria: [] },
  ],
  bands: [
    { key: 'high', label: 'High', min: 60, tone: 'success' },
    { key: 'low', label: 'Low', min: 0, tone: 'purple' },
  ],
};

describe('leadQualityNumber', () => {
  it('reads typed text as a number and a blank as NaN, never a silent 0', () => {
    expect(leadQualityNumber('12.5')).toBe(12.5);
    expect(leadQualityNumber('  ')).toBeNaN();
  });
});

describe('fromConfig', () => {
  it('turns a stored draft into typed text, keeping its change note and showing an unknown tone as red', () => {
    const values = editor.fromConfig(STORED);
    expect(values.criteria[0]).toMatchObject({ weightage: '40', threshold: '', mandatory: true });
    expect(values.criteria[0]?.sub_criteria.map((sub) => [sub.points, sub.threshold])).toEqual([
      ['25.5', '1000'],
      ['14.5', ''],
    ]);
    expect(values.criteria[1]).toMatchObject({ enabled: false, threshold: '', auto_check: 'CRM_UNIQUENESS' });
    expect(values).toMatchObject({ qualify_on_gates: false, min_qualification_score: '61', change_note: 'Tightened Instagram' });
    expect(values.bands.map((band) => [band.min, band.tone])).toEqual([
      ['60', 'success'],
      ['0', 'error'],
    ]);
  });

  it('starts a fresh change note from a published version and qualifies on gates when there is no minimum', () => {
    expect(editor.fromConfig({ ...STORED, status: 'PUBLISHED', min_qualification_score: null })).toMatchObject({
      change_note: '',
      qualify_on_gates: true,
      min_qualification_score: '',
    });
    const withoutMinimum: LeadQualityStoredConfig<Check> = { ...STORED };
    delete withoutMinimum.min_qualification_score;
    expect(editor.fromConfig(withoutMinimum).qualify_on_gates).toBe(true);
  });
});

describe('toBody / toInput', () => {
  it('trims text, reads numbers, and keeps a threshold only for a check that takes one', () => {
    const values = editor.fromConfig(STORED);
    const [instagram] = values.criteria;
    instagram.name = '  Instagram  ';
    instagram.threshold = '50';
    instagram.sub_criteria[0].threshold = '';
    const body = editor.toBody(values);
    expect(body.criteria[0]).toMatchObject({ name: 'Instagram', weightage: 40, threshold: null, guidance: 'Check the profile' });
    expect(body.criteria[0]?.sub_criteria.map((sub) => [sub.points, sub.threshold])).toEqual([
      [25.5, null],
      [14.5, null],
    ]);
    expect(body.min_qualification_score).toBe(61);
    expect(editor.toBody(editor.fromConfig(STORED)).criteria[0]?.sub_criteria[0]?.threshold).toBe(1000);
  });

  it('sends no minimum score while the lead qualifies on its gates alone', () => {
    const values = editor.fromConfig(STORED);
    values.qualify_on_gates = true;
    expect(editor.toBody(values).min_qualification_score).toBeNull();
  });

  it('leaves the key out of new rows, so the server makes one from the name', () => {
    const values = editor.fromConfig(STORED);
    values.criteria.push({ ...editor.blankCriterion(), name: 'Website', sub_criteria: [{ ...editor.blankSubCriterion(), name: 'Loads' }] });
    values.bands.push({ ...editor.blankBand(), label: 'Mid', min: '30' });
    const input = editor.toInput(values);
    expect(input.criteria[0]).toHaveProperty('key', 'instagram');
    expect(input.criteria[2]).not.toHaveProperty('key');
    expect(input.criteria[2]?.sub_criteria[0]).not.toHaveProperty('key');
    expect(input.bands[2]).toEqual({ label: 'Mid', min: 30, tone: 'warning' });
    expect(input.min_qualification_score).toBe(61);
  });
});

describe('blank rows', () => {
  it('start with no check, nothing allocated, enabled, and a yellow band', () => {
    expect(editor.blankCriterion()).toMatchObject({ weightage: '0', enabled: true, mandatory: false, auto_check: 'NONE', sub_criteria: [] });
    expect(editor.blankSubCriterion()).toMatchObject({ points: '0', auto_check: 'NONE', mandatory: false });
    expect(editor.blankBand()).toEqual({ key: '', label: '', min: '', tone: 'warning' });
  });
});

describe('schema and liveIssues', () => {
  it('checks the keyed body in the mode asked, and passes when the rules report nothing', () => {
    checked.report = [];
    const values = editor.fromConfig(STORED);
    values.criteria.push({ ...editor.blankCriterion(), name: 'New' });
    expect(editor.schema(t, 'PUBLISH').safeParse(values).success).toBe(true);
    expect(checked.mode).toBe('PUBLISH');
    expect(checked.body?.criteria[2]?.key).toBe('made_2');
    expect(editor.liveIssues(values, 'DRAFT')).toEqual([]);
    expect(checked.mode).toBe('DRAFT');
  });

  it('puts each reported problem on the field or list root it names, in the reader’s words', () => {
    checked.report = [
      { path: 'criteria', code: 'TOTAL_UNDER', message: 'x', amount: 5 },
      { path: 'criteria.0.sub_criteria.1.points', code: 'NOT_A_NUMBER', message: 'x', amount: null },
      { path: 'bands.1.key', code: 'KEY_DUPLICATE', message: 'x', amount: null },
    ];
    const result = editor.schema(t, 'DRAFT').safeParse(editor.fromConfig(STORED));
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => [issue.path.join('.'), issue.message])).toEqual([
      ['criteria.root', 'crm.leadQualitySettings.issue.totalUnder|5'],
      ['criteria.0.sub_criteria.1.points', 'crm.leadQualitySettings.issue.notANumber|'],
      ['bands.1.label', 'crm.leadQualitySettings.issue.keyDuplicate|'],
    ]);
    checked.report = [];
  });

  it('refuses a check or a tone the rules do not list', () => {
    const values = editor.fromConfig(STORED);
    const tampered = { ...values, bands: [{ ...values.bands[0], tone: 'purple' }] };
    expect(editor.schema(t, 'DRAFT').safeParse(tampered).success).toBe(false);
  });
});
